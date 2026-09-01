import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import EquipamentoDetalhesPage from '../equipment-details-client';
import apiClient from '@/lib/api-service';
import { useAuth } from '@/lib/auth-context';
import { trackEvent } from '@/lib/analytics';
import { useParams } from 'next/navigation';

// Mocks
jest.mock('next/navigation', () => ({
    useParams: jest.fn(),
    useRouter: jest.fn(() => ({ back: jest.fn(), push: jest.fn() })),
}));

// Mock Auth Context (the page calls useAuth() to decide which CTA to show)
jest.mock('@/lib/auth-context', () => ({
    useAuth: jest.fn(),
}));

// Mock analytics so trackEvent is a spy and never touches GA
jest.mock('@/lib/analytics', () => ({
    trackEvent: jest.fn(),
}));

jest.mock('@/lib/api-service', () => ({
    __esModule: true,
    default: {
        get: jest.fn(),
    },
}));

jest.mock('@/components/header', () => ({ Header: () => <div data-testid="mock-header">Header</div> }));
jest.mock('@/components/footer', () => ({ Footer: () => <div data-testid="mock-footer">Footer</div> }));
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
        isAvailable: true,
        imageUrls: ['/img1.jpg'],
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (useParams as jest.Mock).mockReturnValue({ id: 'eq1' });
        // Default: visitor is not logged in
        (useAuth as jest.Mock).mockReturnValue({ userProfile: null });
    });

    it('renders equipment details correctly', async () => {
        (apiClient.get as jest.Mock).mockResolvedValue({ data: mockEquipment });

        render(<EquipamentoDetalhesPage />);

        expect(await screen.findByRole('heading', { name: 'Super Camera' })).toBeInTheDocument();

        // DescriptionSection is rendered twice (mobile + desktop wrappers)
        expect(screen.getAllByText('Amazing camera').length).toBeGreaterThan(0);
        expect(screen.getByText('João Owner')).toBeInTheDocument();
        expect(screen.getByText('Câmeras')).toBeInTheDocument();
        expect(screen.getByText('Novo')).toBeInTheDocument();
        expect(screen.getByText('Venda')).toBeInTheDocument();
        expect(screen.getByText('São Paulo, SP')).toBeInTheDocument();

        expect(apiClient.get).toHaveBeenCalledWith('/equipments/eq1');
        expect(trackEvent).toHaveBeenCalledWith(
            expect.objectContaining({ action: 'view_equipment', label: 'Super Camera', value: 5000 })
        );
    });

    it('shows login CTA when visitor is not authenticated', async () => {
        (apiClient.get as jest.Mock).mockResolvedValue({ data: mockEquipment });

        render(<EquipamentoDetalhesPage />);

        const loginButton = await screen.findByRole('button', { name: /Faça login para negociar/i });
        expect(loginButton.closest('a')).toHaveAttribute('href', '/login');
        expect(screen.queryByText(/Fazer Proposta na Plataforma/i)).not.toBeInTheDocument();
    });

    it('shows negotiate CTA for an authenticated user who is not the owner', async () => {
        (useAuth as jest.Mock).mockReturnValue({ userProfile: { id: 'buyer1' } });
        (apiClient.get as jest.Mock).mockResolvedValue({ data: mockEquipment });

        render(<EquipamentoDetalhesPage />);

        const negotiateButton = await screen.findByRole('button', { name: /Fazer Proposta na Plataforma/i });
        expect(negotiateButton.closest('a')).toHaveAttribute('href', '/negociar-equipamento/eq1');
        expect(screen.queryByText(/Faça login para negociar/i)).not.toBeInTheDocument();
    });

    it('hides negotiation CTAs when the authenticated user is the owner', async () => {
        (useAuth as jest.Mock).mockReturnValue({ userProfile: { id: 'owner1' } });
        (apiClient.get as jest.Mock).mockResolvedValue({ data: mockEquipment });

        render(<EquipamentoDetalhesPage />);

        expect(await screen.findByRole('heading', { name: 'Super Camera' })).toBeInTheDocument();
        expect(screen.queryByText(/Fazer Proposta na Plataforma/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Faça login para negociar/i)).not.toBeInTheDocument();
    });

    it('shows the negotiate CTA and no "Indisponível" badge for an active listing', async () => {
        (useAuth as jest.Mock).mockReturnValue({ userProfile: { id: 'buyer1' } });
        (apiClient.get as jest.Mock).mockResolvedValue({ data: mockEquipment });

        render(<EquipamentoDetalhesPage />);

        expect(await screen.findByRole('heading', { name: 'Super Camera' })).toBeInTheDocument();
        // A API devolve `isAvailable`; o selo só aparece quando o anúncio está pausado.
        expect(screen.queryByText('Indisponível')).not.toBeInTheDocument();
    });

    it('marks a paused listing as unavailable and hides the negotiate CTA', async () => {
        (useAuth as jest.Mock).mockReturnValue({ userProfile: { id: 'buyer1' } });
        (apiClient.get as jest.Mock).mockResolvedValue({
            data: { ...mockEquipment, isAvailable: false },
        });

        render(<EquipamentoDetalhesPage />);

        expect(await screen.findByText('Indisponível')).toBeInTheDocument();
        expect(screen.queryByText(/Fazer Proposta na Plataforma/i)).not.toBeInTheDocument();
    });

    it('handles an empty payload as not found', async () => {
        (apiClient.get as jest.Mock).mockResolvedValue({ data: null });
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

        render(<EquipamentoDetalhesPage />);

        expect(await screen.findByText(/Equipamento não encontrado/i)).toBeInTheDocument();
        expect(trackEvent).not.toHaveBeenCalled();

        consoleError.mockRestore();
    });

    it('handles a failed request as not found', async () => {
        (apiClient.get as jest.Mock).mockRejectedValue(new Error('404'));
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

        render(<EquipamentoDetalhesPage />);

        expect(await screen.findByText(/Equipamento não encontrado/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Voltar para busca/i }).closest('a')).toHaveAttribute('href', '/equipamentos');
        expect(trackEvent).not.toHaveBeenCalled();

        consoleError.mockRestore();
    });
});
