import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NovoEquipamentoPage from '../page';
import { useAuth } from '@/lib/auth-context';
import { createEquipment, uploadEquipmentImages } from '@/lib/data-service';
import { useRouter } from 'next/navigation';

// Mock dependencies
jest.mock('next/navigation', () => ({
    useRouter: jest.fn(),
}));

jest.mock('@/lib/auth-context', () => ({
    useAuth: jest.fn(),
}));

jest.mock('@/lib/data-service', () => ({
    createEquipment: jest.fn(),
    uploadEquipmentImages: jest.fn(),
}));

jest.mock('@/components/header', () => ({ Header: () => <div /> }));
jest.mock('@/components/footer', () => ({ Footer: () => <div /> }));
jest.mock('@/components/scroll-reveal', () => ({ ScrollReveal: ({ children }: any) => <div>{children}</div> }));

// The page delegates country/state/city to LocationSelector (combobox + API driven).
// Mock it with plain buttons that invoke the same callbacks the real component would.
jest.mock('@/components/location-selector', () => ({
    LocationSelector: ({ onCountryChange, onStateChange, onCityChange }: any) => (
        <div data-testid="mock-location-selector">
            <button type="button" onClick={() => onCountryChange?.(1, 'Brasil')}>
                mock-select-country
            </button>
            <button type="button" onClick={() => onStateChange(2, 'São Paulo', 'SP')}>
                mock-select-state
            </button>
            <button type="button" onClick={() => onCityChange(3, 'São Paulo')}>
                mock-select-city
            </button>
        </div>
    ),
}));

// UI mocks
jest.mock('@/components/ui/select', () => ({
    Select: ({ onValueChange, value }: any) => (
        <select
            data-testid="mock-select"
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
        >
            <option value="">Select</option>
            <option value="Câmeras">Câmeras</option>
            <option value="used">used</option>
            <option value="sale">sale</option>
        </select>
    ),
    SelectContent: ({ children }: any) => <>{children}</>,
    SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
    SelectTrigger: ({ children }: any) => <>{children}</>,
    SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
}));

jest.mock('@/components/ui/textarea', () => ({
    Textarea: (props: any) => <textarea {...props} />,
}));

jest.mock('@/components/ui/input', () => ({
    Input: (props: any) => <input {...props} />,
}));

jest.mock('@/components/ui/button', () => ({
    Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

jest.mock('@/components/ui/card', () => ({
    Card: ({ children }: any) => <div>{children}</div>,
    CardHeader: ({ children }: any) => <div>{children}</div>,
    CardTitle: ({ children }: any) => <div>{children}</div>,
    CardDescription: ({ children }: any) => <div>{children}</div>,
    CardContent: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/ui/label', () => ({
    Label: ({ children, htmlFor }: any) => <label htmlFor={htmlFor}>{children}</label>,
}));

jest.mock('@/components/ui/alert', () => ({
    Alert: ({ children }: any) => <div>{children}</div>,
    AlertDescription: ({ children }: any) => <div>{children}</div>,
}));

describe('NovoEquipamentoPage', () => {
    const mockRouter = { push: jest.fn(), back: jest.fn() };
    const mockUser = { id: 'user1', displayName: 'User Test' };

    beforeEach(() => {
        jest.clearAllMocks();
        (useRouter as jest.Mock).mockReturnValue(mockRouter);
        (useAuth as jest.Mock).mockReturnValue({
            userProfile: mockUser,
            loading: false,
        });
    });

    /**
     * Fills every field handleSubmit validates before calling createEquipment:
     * at least one image, description, brand, model, country, state, city and price.
     */
    const fillValidForm = async (container: HTMLElement) => {
        fireEvent.change(container.querySelector('#name')!, { target: { value: 'Camera Teste' } });
        fireEvent.change(container.querySelector('#description')!, { target: { value: 'Descricao Teste' } });
        fireEvent.change(container.querySelector('#brand')!, { target: { value: 'Canon' } });
        fireEvent.change(container.querySelector('#model')!, { target: { value: 'EOS R5' } });

        // Only category, condition and negotiationType are Selects now;
        // the location fields live inside LocationSelector.
        const selects = await screen.findAllByTestId('mock-select');
        expect(selects).toHaveLength(3);
        fireEvent.change(selects[0], { target: { value: 'Câmeras' } });
        fireEvent.change(selects[1], { target: { value: 'used' } });
        fireEvent.change(selects[2], { target: { value: 'sale' } });

        fireEvent.change(container.querySelector('#price')!, { target: { value: '1000' } });

        // Location: the page resets state/city on country change and city on state change,
        // so drive the callbacks in order.
        fireEvent.click(screen.getByText('mock-select-country'));
        fireEvent.click(screen.getByText('mock-select-state'));
        fireEvent.click(screen.getByText('mock-select-city'));

        // Image: required by the page's validation.
        const file = new File(['img'], 'foto.png', { type: 'image/png' });
        fireEvent.change(container.querySelector('#images-input')!, { target: { files: [file] } });
        // Preview is generated asynchronously via FileReader; wait for it so the
        // selected image is fully processed before submitting.
        expect(await screen.findByAltText('Preview 1')).toBeInTheDocument();

        return file;
    };

    it('submits form successfully', async () => {
        (uploadEquipmentImages as jest.Mock).mockResolvedValue(['img1.jpg']);
        (createEquipment as jest.Mock).mockResolvedValue({ id: 'new-eq' });

        const { container } = render(<NovoEquipamentoPage />);

        const file = await fillValidForm(container);

        fireEvent.submit(container.querySelector('form')!);

        await waitFor(() => {
            expect(uploadEquipmentImages).toHaveBeenCalledWith([file], 'user1');
            expect(createEquipment).toHaveBeenCalledTimes(1);
            expect(createEquipment).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'Camera Teste',
                    description: 'Descricao Teste',
                    brand: 'Canon',
                    model: 'EOS R5',
                    category: 'Câmeras',
                    condition: 'used',
                    negotiationType: 'sale',
                    price: 1000,
                    country: 'Brasil',
                    state: 'SP',
                    city: 'São Paulo',
                    imageUrls: ['img1.jpg'],
                    ownerId: 'user1',
                    ownerName: 'User Test',
                    isAvailable: true,
                })
            );
        });

        expect(await screen.findByText(/Equipamento cadastrado com sucesso/i)).toBeInTheDocument();

        // Redirect happens after a 1.5s delay
        await waitFor(() => {
            expect(mockRouter.push).toHaveBeenCalledWith('/dashboard/equipamentos');
        }, { timeout: 3000 });
    });

    it('shows error message on failure', async () => {
        (uploadEquipmentImages as jest.Mock).mockResolvedValue(['img1.jpg']);
        (createEquipment as jest.Mock).mockRejectedValue(new Error('Erro ao criar'));

        const { container } = render(<NovoEquipamentoPage />);

        await fillValidForm(container);

        fireEvent.submit(container.querySelector('form')!);

        expect(await screen.findByText(/Erro ao salvar equipamento: Erro ao criar/i)).toBeInTheDocument();
        expect(createEquipment).toHaveBeenCalledTimes(1);
        expect(mockRouter.push).not.toHaveBeenCalled();
    });
});
