import React, { useState } from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { LocationSelector } from '../location-selector';
import apiClient from '@/lib/api-service';

jest.mock('@/lib/api-service', () => ({
    __esModule: true,
    default: { get: jest.fn() },
}));

const COUNTRIES = [
    { id: 1, name: 'Brazil', code: 'BR' },
    { id: 2, name: 'Portugal', code: 'PT' },
];
const STATES_BR = [
    { id: 10, name: 'São Paulo', uf: 'SP' },
    { id: 11, name: 'Minas Gerais', uf: 'MG' },
];
const CITIES_SP = [
    { id: 100, name: 'Campinas', state_id: 10, ddd: 19 },
    { id: 101, name: 'São Paulo', state_id: 10, ddd: 11 },
];

function mockLocationsApi() {
    (apiClient.get as jest.Mock).mockImplementation((url: string) => {
        if (url === '/locations/countries') return Promise.resolve({ data: COUNTRIES });
        if (url === '/locations/countries/1/states') return Promise.resolve({ data: STATES_BR });
        if (url === '/locations/states/10/cities') return Promise.resolve({ data: CITIES_SP });
        return Promise.resolve({ data: [] });
    });
}

type Form = { country: string; state: string; city: string };
type Ids = { countryId: number; stateId: number; cityId: number };

/**
 * Reproduz o padrão usado pelas páginas (equipamentos, vagas, perfil):
 * os callbacks de país/estado ZERAM os níveis abaixo — correto numa troca
 * manual, mas também disparam durante a hidratação inicial.
 */
function Harness({ initial }: { initial: Form }) {
    const [form, setForm] = useState<Form>(initial);
    const [ids, setIds] = useState<Ids>({ countryId: 0, stateId: 0, cityId: 0 });
    const [, setTick] = useState(0);

    return (
        <div>
            <LocationSelector
                selectedCountryId={ids.countryId}
                selectedStateId={ids.stateId}
                selectedCityId={ids.cityId}
                initialCountryName={form.country}
                initialStateUf={form.state}
                initialCityName={form.city}
                onCountryChange={(id, name) => {
                    setIds(prev => ({ ...prev, countryId: id, stateId: 0, cityId: 0 }));
                    setForm(prev => ({ ...prev, country: name, state: '', city: '' }));
                }}
                onStateChange={(id, _name, uf) => {
                    setIds(prev => ({ ...prev, stateId: id, cityId: 0 }));
                    setForm(prev => ({ ...prev, state: uf, city: '' }));
                }}
                onCityChange={(id, name) => {
                    setIds(prev => ({ ...prev, cityId: id }));
                    setForm(prev => ({ ...prev, city: name }));
                }}
            />
            <button onClick={() => setTick(t => t + 1)}>rerender</button>
            <button onClick={() => setForm({ country: 'Brazil', state: 'SP', city: 'Campinas' })}>load</button>
            <output data-testid="form">{JSON.stringify(form)}</output>
            <output data-testid="ids">{JSON.stringify(ids)}</output>
        </div>
    );
}

describe('LocationSelector hydration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockLocationsApi();
    });

    it('restores country, state and city even though the parent clears lower levels on each change', async () => {
        render(<Harness initial={{ country: 'Brazil', state: 'SP', city: 'Campinas' }} />);

        await waitFor(() => {
            expect(JSON.parse(screen.getByTestId('ids').textContent!)).toEqual({ countryId: 1, stateId: 10, cityId: 100 });
        });
        expect(JSON.parse(screen.getByTestId('form').textContent!)).toEqual({ country: 'Brazil', state: 'SP', city: 'Campinas' });
    });

    it('hydrates values that arrive after mount (async-loaded forms)', async () => {
        render(<Harness initial={{ country: '', state: '', city: '' }} />);

        // Countries loaded, nothing to hydrate yet.
        await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith('/locations/countries'));
        expect(JSON.parse(screen.getByTestId('ids').textContent!)).toEqual({ countryId: 0, stateId: 0, cityId: 0 });

        fireEvent.click(screen.getByText('load'));

        await waitFor(() => {
            expect(JSON.parse(screen.getByTestId('ids').textContent!)).toEqual({ countryId: 1, stateId: 10, cityId: 100 });
        });
        expect(JSON.parse(screen.getByTestId('form').textContent!)).toEqual({ country: 'Brazil', state: 'SP', city: 'Campinas' });
    });

    it('fetches the country list only once, even when the parent re-renders with new inline callbacks', async () => {
        render(<Harness initial={{ country: 'Brazil', state: 'SP', city: 'Campinas' }} />);

        await waitFor(() => {
            expect(JSON.parse(screen.getByTestId('ids').textContent!).cityId).toBe(100);
        });

        fireEvent.click(screen.getByText('rerender'));
        fireEvent.click(screen.getByText('rerender'));
        fireEvent.click(screen.getByText('rerender'));

        const countryCalls = (apiClient.get as jest.Mock).mock.calls.filter(([url]) => url === '/locations/countries');
        expect(countryCalls).toHaveLength(1);
    });

    it('does not render the country picker when onCountryChange is not provided', async () => {
        render(
            <LocationSelector
                selectedCountryId={1}
                selectedStateId={null}
                selectedCityId={null}
                onStateChange={jest.fn()}
                onCityChange={jest.fn()}
            />
        );

        await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith('/locations/countries/1/states'));
        expect(screen.queryByText('País')).not.toBeInTheDocument();
        expect(apiClient.get).not.toHaveBeenCalledWith('/locations/countries');
    });
});
