import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EditarEquipamentoPage from '../page';
import { useAuth } from '@/lib/auth-context';
import { fetchEquipmentById, updateEquipment, uploadEquipmentImages } from '@/lib/data-service';
import { useRouter, useParams } from 'next/navigation';

// Mocks
jest.mock('next/navigation', () => ({
    useRouter: jest.fn(),
    useParams: jest.fn(),
}));

jest.mock('@/lib/auth-context', () => ({
    useAuth: jest.fn(),
}));

jest.mock('@/lib/data-service', () => ({
    fetchEquipmentById: jest.fn(),
    updateEquipment: jest.fn(),
    uploadEquipmentImages: jest.fn(),
    deleteEquipmentImages: jest.fn(),
}));

// A página envolve o PUT com withStorageRollback (limpeza de imagens órfãs).
jest.mock('@/lib/storage-cleanup', () => ({
    withStorageRollback: jest.fn((_bucket: string, _urls: string[], op: () => Promise<any>) => op()),
    removeStorageFiles: jest.fn(),
}));

jest.mock('@/components/header', () => ({ Header: () => <div /> }));
jest.mock('@/components/footer', () => ({ Footer: () => <div /> }));
jest.mock('@/components/scroll-reveal', () => ({ ScrollReveal: ({ children }: any) => <div>{children}</div> }));

// LocationSelector fetches countries/states/cities through apiClient (axios) on mount.
// Stub it so the suite stays offline and deterministic; the page keeps the
// country/state/city loaded from the equipment in formData, which is what the
// submit validation reads.
jest.mock('@/components/location-selector', () => ({
    LocationSelector: ({ initialCountryName, initialStateUf, initialCityName }: any) => (
        <div data-testid="mock-location-selector">
            <span>{initialCountryName}</span>
            <span>{initialStateUf}</span>
            <span>{initialCityName}</span>
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
            <option value="SP">SP</option>
            <option value="new">new</option>
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

describe('EditarEquipamentoPage', () => {
    const mockRouter = { push: jest.fn(), back: jest.fn() };

    // The page's submit validation requires: at least one image, description,
    // brand, model, country, state, city and (for non-free listings) a price.
    const mockEquipment = {
        id: 'eq1',
        name: 'Existing Camera',
        category: 'Câmeras',
        negotiationType: 'sale',
        condition: 'used',
        price: 500,
        city: 'São Paulo',
        state: 'SP',
        country: 'Brasil',
        description: 'Existing Description',
        ownerId: 'user1',
        brand: 'Canon',
        model: 'EOS R5',
        isAvailable: true,
        imageUrls: ['https://cdn.example.com/eq1/photo-1.jpg'],
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (useRouter as jest.Mock).mockReturnValue(mockRouter);
        (useParams as jest.Mock).mockReturnValue({ id: 'eq1' });
        (useAuth as jest.Mock).mockReturnValue({
            userProfile: { id: 'user1', displayName: 'User Test' },
            loading: false
        });
    });

    it('loads and displays equipment data', async () => {
        (fetchEquipmentById as jest.Mock).mockResolvedValue(mockEquipment);

        render(<EditarEquipamentoPage />);

        expect(await screen.findByDisplayValue('Existing Camera')).toBeInTheDocument();
        // Busca direta pelo id: a listagem esconde anúncios pausados.
        expect(fetchEquipmentById).toHaveBeenCalledWith('eq1');
        expect(screen.getByAltText('Preview 1')).toHaveAttribute('src', mockEquipment.imageUrls[0]);
    });

    it('shows a validation error and does not update when required fields are missing', async () => {
        // No images and no country: the page must block the update.
        (fetchEquipmentById as jest.Mock).mockResolvedValue({
            ...mockEquipment, imageUrls: [], country: '',
        });

        const { container } = render(<EditarEquipamentoPage />);

        await screen.findByDisplayValue('Existing Camera');

        fireEvent.submit(container.querySelector('form')!);

        expect(await screen.findByText(/campos são obrigatórios/i)).toHaveTextContent(
            'pelo menos uma foto'
        );
        expect(updateEquipment).not.toHaveBeenCalled();
        expect(mockRouter.push).not.toHaveBeenCalled();
    });

    it('loads a paused listing instead of claiming it does not exist', async () => {
        (fetchEquipmentById as jest.Mock).mockResolvedValue({ ...mockEquipment, isAvailable: false });

        render(<EditarEquipamentoPage />);

        expect(await screen.findByDisplayValue('Existing Camera')).toBeInTheDocument();
        expect(screen.queryByText(/não tem permissão/i)).not.toBeInTheDocument();
    });

    it('updates equipment successfully', async () => {
        (fetchEquipmentById as jest.Mock).mockResolvedValue(mockEquipment);
        (updateEquipment as jest.Mock).mockResolvedValue({ ...mockEquipment, name: 'Updated Name' });

        const { container } = render(<EditarEquipamentoPage />);

        await screen.findByDisplayValue('Existing Camera');

        fireEvent.change(container.querySelector('#name')!, { target: { value: 'Updated Name' } });

        fireEvent.submit(container.querySelector('form')!);

        await waitFor(() => {
            expect(updateEquipment).toHaveBeenCalledWith('eq1', expect.objectContaining({ name: 'Updated Name' }));
        });

        // Existing images are kept (no new files, so no upload) and the
        // location loaded from the equipment is sent back unchanged.
        expect(uploadEquipmentImages).not.toHaveBeenCalled();
        expect(updateEquipment).toHaveBeenCalledWith(
            'eq1',
            expect.objectContaining({
                imageUrls: mockEquipment.imageUrls,
                country: 'Brasil',
                state: 'SP',
                city: 'São Paulo',
                price: 500,
            })
        );

        expect(await screen.findByText(/atualizado com sucesso/i)).toBeInTheDocument();

        // The page redirects 1.5s after a successful update.
        await waitFor(() => {
            expect(mockRouter.push).toHaveBeenCalledWith('/dashboard/equipamentos');
        }, { timeout: 3000 });
    });
});
