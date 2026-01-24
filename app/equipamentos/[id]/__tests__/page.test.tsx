import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import EquipamentoDetalhesPage from '../page';
import apiClient from '@/lib/api-service';
import { useParams } from 'next/navigation';

// Mocks
jest.mock('next/navigation', () => ({
    useParams: jest.fn(),
    useRouter: jest.fn(() => ({ back: jest.fn() })),
}));

jest.mock('@/lib/api-service', () => ({
    __esModule: true,
    default: {
        get: jest.fn(),
    },
}));

jest.mock('@/components/header', () => ({ Header: () => <div>Header</div> }));
jest.mock('@/components/footer', () => ({ Footer: () => <div>Footer</div> }));
jest.mock('@/components/scroll-reveal', () => ({ ScrollReveal: ({ children }: any) => <div>{children}</div> }));

// Mock framer-motion
jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
        img: ({ children, ...props }: any) => <img {...props} />
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('EquipamentoDetalhesPage', () => {
    const mockEquipment = {
        id: 'eq1',
        name: 'Super Camera',
        category: 'Câmeras',
        negotiationType: 'sale',
        condition: 'new',
        price: 5000,
        city: 'São Paulo',
        state: 'SP',
        description: 'Amazing camera',
        ownerId: 'owner1',
        ownerName: 'João Owner',
        available: true,
        imageUrls: ['img1.jpg'],
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (useParams as jest.Mock).mockReturnValue({ id: 'eq1' });
    });

    it('renders equipment details correctly', async () => {
        (apiClient.get as jest.Mock).mockResolvedValue({ data: mockEquipment });

        render(<EquipamentoDetalhesPage />);

        await waitFor(() => {
            expect(screen.getByText('Super Camera')).toBeInTheDocument();
            expect(screen.getByText('Amazing camera')).toBeInTheDocument();
            expect(screen.getByText(/João Owner/i)).toBeInTheDocument();
        });
    });

    it('handles not found', async () => {
        (apiClient.get as jest.Mock).mockResolvedValue({ data: null });
        render(<EquipamentoDetalhesPage />);

        await waitFor(() => {
            expect(screen.getByText(/Equipamento não encontrado/i)).toBeInTheDocument();
        });
    });
});
