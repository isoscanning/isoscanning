import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import PerfilPage from '../page';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-service';
import * as dataService from '@/lib/data-service';

// Mock Next.js router
jest.mock('next/navigation', () => ({
    useRouter: jest.fn(),
}));

// Mock Auth Context
jest.mock('@/lib/auth-context', () => ({
    useAuth: jest.fn(),
}));

// Mock API client (axios instance) — nothing may reach the network.
jest.mock('@/lib/api-service', () => ({
    get: jest.fn(),
    put: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
}));

// Mock Data Service
jest.mock('@/lib/data-service', () => ({
    fetchPortfolio: jest.fn(),
    createPortfolioItem: jest.fn(),
    deletePortfolioItem: jest.fn(),
    uploadPortfolioItemImage: jest.fn(),
    fetchAvailability: jest.fn(),
    createAvailability: jest.fn(),
    deleteAvailability: jest.fn(),
    deleteAvailabilities: jest.fn(),
    fetchSpecialties: jest.fn(),
    // Puro (sem rede): mantém o comportamento real para as reservas do fluxo de contrato/acordo
    isFlowReservation: (slot: { contractId?: string | null; jobApplicationId?: string | null }) =>
        !!slot.contractId || !!slot.jobApplicationId,
}));

// Avatar upload goes to Supabase Storage — keep it out of the test.
jest.mock('@/lib/supabase-storage', () => ({
    uploadAvatar: jest.fn(),
}));

// Mock components
jest.mock('@/components/header', () => ({
    Header: () => <div data-testid="mock-header">Header</div>,
}));

jest.mock('@/components/footer', () => ({
    Footer: () => <div data-testid="mock-footer">Footer</div>,
}));

// The real LocationSelector loads countries/states/cities through
// apiClient.get('/locations/...') and renders cmdk comboboxes inside Radix
// popovers. Replace it with a stub that exposes the same callbacks so the
// page's state/city wiring can still be exercised deterministically.
jest.mock('@/components/location-selector', () => ({
    LocationSelector: ({ initialStateUf, initialCityName, onStateChange, onCityChange }: any) => (
        <div data-testid="mock-location-selector">
            <span data-testid="mock-location-value">
                {`${initialStateUf || '-'} / ${initialCityName || '-'}`}
            </span>
            <button type="button" onClick={() => onStateChange(31, 'Minas Gerais', 'MG')}>
                Selecionar estado MG
            </button>
            <button type="button" onClick={() => onCityChange(3136702, 'Juiz de Fora', 32)}>
                Selecionar cidade Juiz de Fora
            </button>
        </div>
    ),
}));

describe('PerfilPage', () => {
    const mockRouter = {
        push: jest.fn(),
    };

    const updateProfile = jest.fn();

    const mockUser = {
        id: 'user123',
        displayName: 'Test User',
        userType: 'professional',
        avatarUrl: 'old-avatar.jpg',
    };

    // Fresh profile returned by GET /profiles/:id
    const mockProfile = {
        ...mockUser,
        description: 'Old description',
        specialties: ['Fotógrafo'],
        city: 'Belo Horizonte',
        state: 'MG',
        phone: '32999990000',
        phoneCountryCode: '+55',
        isPublished: false,
    };

    const mockSpecialties = [
        { id: '1', name: 'Fotógrafo' },
        { id: '2', name: 'Videomaker' },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
        (useRouter as jest.Mock).mockReturnValue(mockRouter);
        updateProfile.mockResolvedValue({});
        (useAuth as jest.Mock).mockReturnValue({
            userProfile: mockUser,
            loading: false,
            updateProfile,
        });
        (dataService.fetchSpecialties as jest.Mock).mockResolvedValue(mockSpecialties);
        (dataService.fetchPortfolio as jest.Mock).mockResolvedValue([]);
        (dataService.fetchAvailability as jest.Mock).mockResolvedValue([]);

        // Route by URL: the page fetches the profile; the (real) LocationSelector
        // would fetch /locations/* and expects arrays, never the profile object.
        (apiClient.get as jest.Mock).mockImplementation((url: string) => {
            if (url === `/profiles/${mockUser.id}`) {
                return Promise.resolve({ data: { ...mockProfile } });
            }
            return Promise.resolve({ data: [] });
        });

        // Mock restcountries fetch used for the phone country-code selector
        global.fetch = jest.fn().mockResolvedValue({
            json: jest.fn().mockResolvedValue([
                { cca2: 'BR', flag: '🇧🇷', idd: { root: '+', suffixes: ['55'] }, name: { common: 'Brazil' } }
            ])
        }) as any;
    });

    // Renders the page and waits until every initial async load has settled
    // (profile + portfolio + availability => loading overlay gone; countries => "+55").
    const renderPage = async () => {
        const utils = render(<PerfilPage />);
        await waitFor(() => {
            expect(screen.queryByText('Carregando seu perfil...')).not.toBeInTheDocument();
        });
        await screen.findByText('+55');
        return utils;
    };

    it('renders correctly and loads data', async () => {
        await renderPage();

        expect(screen.getByText('Meu Perfil')).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'Dados Pessoais' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'Portfólio' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'Agenda' })).toBeInTheDocument();

        expect(dataService.fetchSpecialties).toHaveBeenCalled();
        expect(apiClient.get).toHaveBeenCalledWith('/profiles/user123');
        expect(dataService.fetchPortfolio).toHaveBeenCalledWith('user123');
        expect(dataService.fetchAvailability).toHaveBeenCalledWith('user123');

        // Fresh profile data populates the form
        expect(screen.getByLabelText(/Nome Completo \*/i)).toHaveValue('Test User');
        expect(screen.getByLabelText(/Descrição \/ Bio \*/i)).toHaveValue('Old description');
        expect(screen.getByLabelText(/Telefone \/ WhatsApp/i)).toHaveValue('32999990000');
        expect(screen.getByTestId('mock-location-value')).toHaveTextContent('MG / Belo Horizonte');

        // Specialties list is rendered from fetchSpecialties
        expect(screen.getAllByText('Fotógrafo').length).toBeGreaterThan(0);
        expect(screen.getByText('Videomaker')).toBeInTheDocument();
    });

    it('submits personal data form correctly', async () => {
        await renderPage();

        fireEvent.change(screen.getByLabelText(/Nome Completo \*/i), { target: { value: 'Updated Name' } });
        fireEvent.change(screen.getByLabelText(/Descrição \/ Bio \*/i), { target: { value: 'Test description' } });

        // Location is picked through the LocationSelector callbacks (state first, then city)
        fireEvent.click(screen.getByText('Selecionar estado MG'));
        fireEvent.click(screen.getByText('Selecionar cidade Juiz de Fora'));
        expect(screen.getByTestId('mock-location-value')).toHaveTextContent('MG / Juiz de Fora');

        fireEvent.click(screen.getByRole('button', { name: 'Salvar Alterações' }));

        await waitFor(() => {
            expect(updateProfile).toHaveBeenCalledTimes(1);
        });
        expect(updateProfile).toHaveBeenCalledWith(expect.objectContaining({
            displayName: 'Updated Name',
            description: 'Test description',
            state: 'MG',
            city: 'Juiz de Fora',
            phone: '32999990000',
            phoneCountryCode: '+55',
            isPublished: false,
        }));

        // Success dialog is shown after saving
        expect(await screen.findByText('Dados Salvos com Sucesso!')).toBeInTheDocument();
    });

    it('switches tabs to Portfolio', async () => {
        await renderPage();

        expect(screen.queryByText('Seu Portfólio')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('tab', { name: 'Portfólio' }));

        expect(await screen.findByText('Seu Portfólio')).toBeInTheDocument();
        expect(screen.queryByLabelText(/Nome Completo \*/i)).not.toBeInTheDocument();
    });

    it('switches tabs to Agenda', async () => {
        await renderPage();

        expect(screen.queryByText('Minha Disponibilidade')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('tab', { name: 'Agenda' }));

        expect(await screen.findByText('Minha Disponibilidade')).toBeInTheDocument();
        expect(screen.queryByLabelText(/Nome Completo \*/i)).not.toBeInTheDocument();
    });
});
