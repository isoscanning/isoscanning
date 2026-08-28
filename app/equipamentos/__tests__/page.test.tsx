import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import EquipamentosPage from '../page';
import { fetchEquipments } from '@/lib/data-service';

// Mock Supabase to avoid env var errors
jest.mock('@/lib/supabase', () => ({
    supabase: {
        auth: {
            onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
            getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
        },
    },
}));

// Mock API Client
jest.mock('@/lib/api-service', () => ({
    __esModule: true,
    default: {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
    },
}));

jest.mock('@/components/header', () => ({
    Header: () => <div data-testid="mock-header">Header</div>,
}));

jest.mock('@/components/footer', () => ({
    Footer: () => <div data-testid="mock-footer">Footer</div>,
}));

// Mock the data-service
jest.mock('@/lib/data-service', () => ({
    fetchEquipments: jest.fn(),
}));

// Mock components with complex logic or browser APIs
jest.mock('@/components/scroll-reveal', () => ({
    ScrollReveal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/typing-text', () => ({
    CountUp: ({ end }: { end: number }) => <span>{end}</span>,
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('EquipamentosPage', () => {
    const mockEquipments = [
        {
            id: '1',
            name: 'Camera Sony A7III',
            category: 'Câmeras',
            negotiationType: 'sale',
            condition: 'used',
            price: 8500,
            city: 'São Paulo',
            state: 'SP',
            imageUrl: 'https://example.com/cam.jpg',
            ownerId: 'owner1',
            ownerName: 'João',
            ownerVerified: true,
            isAvailable: true,
        },
        {
            id: '2',
            name: 'Lente Canon 50mm',
            category: 'Lentes',
            negotiationType: 'rent',
            rentPeriod: 'day',
            condition: 'new',
            price: 100,
            city: 'Rio de Janeiro',
            state: 'RJ',
            imageUrl: 'https://example.com/lens.jpg',
            ownerId: 'owner2',
            ownerName: 'Maria',
            isAvailable: true,
        },
    ];

    /** GET /equipments devolve { data, total, limit, offset }. */
    const page = (items: any[], total = items.length) => ({
        data: items,
        total,
        limit: 24,
        offset: 0,
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders loading state initially', async () => {
        (fetchEquipments as jest.Mock).mockReturnValue(new Promise(() => { })); // Pendente

        render(<EquipamentosPage />);

        expect(screen.getByText(/Marketplace de Equipamentos/i)).toBeInTheDocument();
        // Check for loading skeletons logic (usually implied by lack of content or specific loading indicator if strictly implemented)
        // In the component, loading renders a grid of Cards with 'animate-pulse'. 
        // We can check if the main content is not yet visible or check for a specific loading test id if we added one.
        // For now, let's verify that "Nenhum equipamento encontrado" is NOT shown yet.
        expect(screen.queryByText(/Nenhum equipamento encontrado/i)).not.toBeInTheDocument();
    });

    it('renders equipments after loading', async () => {
        (fetchEquipments as jest.Mock).mockResolvedValue(page(mockEquipments));

        render(<EquipamentosPage />);

        await waitFor(() => {
            expect(screen.getByText('Camera Sony A7III')).toBeInTheDocument();
            expect(screen.getByText('Lente Canon 50mm')).toBeInTheDocument();
        });

        expect(screen.getByText('2 equipamentos encontrados')).toBeInTheDocument();
        expect(screen.getByText('R$ 8.500,00')).toBeInTheDocument();
    });

    it('sends the search term to the API (debounced) instead of filtering locally', async () => {
        (fetchEquipments as jest.Mock).mockResolvedValue(page(mockEquipments));

        render(<EquipamentosPage />);

        await waitFor(() => {
            expect(screen.getByText('Camera Sony A7III')).toBeInTheDocument();
        });

        (fetchEquipments as jest.Mock).mockResolvedValue(page([mockEquipments[0]], 1));

        const searchInput = screen.getByPlaceholderText(/Buscar equipamentos/i);
        fireEvent.change(searchInput, { target: { value: 'Sony' } });

        // Debounce: nada é disparado imediatamente
        expect(fetchEquipments).toHaveBeenCalledTimes(1);

        await waitFor(() => {
            expect(fetchEquipments).toHaveBeenCalledWith(
                expect.objectContaining({ query: 'Sony', offset: 0, availableOnly: true })
            );
        });

        await waitFor(() => {
            expect(screen.queryByText('Lente Canon 50mm')).not.toBeInTheDocument();
        });
    });

    it('shows the verified badge only for owners on a paid plan', async () => {
        (fetchEquipments as jest.Mock).mockResolvedValue(page(mockEquipments));

        render(<EquipamentosPage />);

        await waitFor(() => {
            expect(screen.getByText('Camera Sony A7III')).toBeInTheDocument();
        });

        expect(screen.getAllByLabelText('Perfil verificado')).toHaveLength(1);
    });

    it('paginates with the API total instead of loading everything at once', async () => {
        (fetchEquipments as jest.Mock).mockResolvedValue(page([mockEquipments[0]], 2));

        render(<EquipamentosPage />);

        const loadMore = await screen.findByRole('button', { name: /Carregar mais/i });

        (fetchEquipments as jest.Mock).mockResolvedValue({
            data: [mockEquipments[1]],
            total: 2,
            limit: 24,
            offset: 1,
        });

        fireEvent.click(loadMore);

        await waitFor(() => {
            expect(fetchEquipments).toHaveBeenCalledWith(expect.objectContaining({ offset: 1 }));
            expect(screen.getByText('Lente Canon 50mm')).toBeInTheDocument();
        });

        // Chegou ao total: o botão some
        expect(screen.queryByRole('button', { name: /Carregar mais/i })).not.toBeInTheDocument();
    });

    it('opens filters panel when button is clicked', async () => {
        (fetchEquipments as jest.Mock).mockResolvedValue(page(mockEquipments));

        render(<EquipamentosPage />);

        const filterButton = screen.getByText(/Filtros/i);
        fireEvent.click(filterButton);

        await waitFor(() => {
            expect(screen.getByText('Categoria')).toBeInTheDocument();
            expect(screen.getByText('Condição')).toBeInTheDocument();
        });
    });

    it('shows empty state when no equipments match', async () => {
        (fetchEquipments as jest.Mock).mockResolvedValue(page([]));

        render(<EquipamentosPage />);

        await waitFor(() => {
            expect(screen.getByText('Nenhum equipamento encontrado')).toBeInTheDocument();
        });
    });
});
