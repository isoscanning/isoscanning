import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MeusEquipamentosPage from '../page';
import { useAuth } from '@/lib/auth-context';
import { fetchUserEquipments, updateEquipment } from '@/lib/data-service';
import { toast } from 'sonner';

jest.mock('next/navigation', () => ({
    useRouter: jest.fn(() => ({ push: jest.fn() })),
}));

jest.mock('@/lib/auth-context', () => ({
    useAuth: jest.fn(),
}));

jest.mock('@/lib/data-service', () => ({
    fetchUserEquipments: jest.fn(),
    deleteEquipment: jest.fn(),
    deleteEquipmentImages: jest.fn(),
    updateEquipment: jest.fn(),
}));

// Plano: só alimenta a dica de cota do cabeçalho.
jest.mock('@/lib/plans/use-plan', () => ({
    usePlan: () => ({ label: 'Free', limitOf: () => 1 }),
}));

jest.mock('sonner', () => ({
    toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock('@/components/ui/sonner', () => ({ Toaster: () => null }));
jest.mock('@/components/header', () => ({ Header: () => <div /> }));
jest.mock('@/components/footer', () => ({ Footer: () => <div /> }));
jest.mock('@/components/scroll-reveal', () => ({ ScrollReveal: ({ children }: any) => <div>{children}</div> }));

describe('MeusEquipamentosPage', () => {
    const active = {
        id: 'eq-active',
        name: 'Camera Ativa',
        category: 'Câmeras',
        negotiationType: 'sale',
        price: 100,
        isAvailable: true,
        imageUrls: [],
    };

    const paused = {
        id: 'eq-paused',
        name: 'Camera Pausada',
        category: 'Câmeras',
        negotiationType: 'rent',
        price: 50,
        isAvailable: false,
        imageUrls: [],
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (useAuth as jest.Mock).mockReturnValue({
            userProfile: { id: 'user1', displayName: 'User Test' },
            loading: false,
        });
    });

    it('lista também os anúncios pausados do dono', async () => {
        (fetchUserEquipments as jest.Mock).mockResolvedValue([active, paused]);

        render(<MeusEquipamentosPage />);

        expect(await screen.findByText('Camera Pausada')).toBeInTheDocument();
        expect(screen.getByText('Pausado')).toBeInTheDocument();
        expect(screen.getByText('Publicado')).toBeInTheDocument();
        // A cota do backend conta só os ativos
        expect(screen.getByText(/1\/1 equipamentos ativos/)).toBeInTheDocument();
    });

    it('pausa um anúncio publicado', async () => {
        (fetchUserEquipments as jest.Mock).mockResolvedValue([active]);
        (updateEquipment as jest.Mock).mockResolvedValue(undefined);

        render(<MeusEquipamentosPage />);

        fireEvent.click(await screen.findByRole('button', { name: 'Pausar anúncio' }));

        await waitFor(() => {
            expect(updateEquipment).toHaveBeenCalledWith('eq-active', { isAvailable: false });
        });

        expect(await screen.findByRole('button', { name: 'Reativar anúncio' })).toBeInTheDocument();
        expect(toast.success).toHaveBeenCalled();
    });

    it('não mostra toast destrutivo quando reativar estoura a cota do plano', async () => {
        (fetchUserEquipments as jest.Mock).mockResolvedValue([paused]);
        const planError: any = new Error('Limite do plano atingido');
        planError.response = {
            status: 403,
            data: { statusCode: 403, code: 'PLAN_LIMIT', feature: 'equipmentListings' },
        };
        (updateEquipment as jest.Mock).mockRejectedValue(planError);

        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => { });

        render(<MeusEquipamentosPage />);

        fireEvent.click(await screen.findByRole('button', { name: 'Reativar anúncio' }));

        await waitFor(() => {
            expect(updateEquipment).toHaveBeenCalledWith('eq-paused', { isAvailable: true });
        });

        // O modal de upgrade já foi aberto pelo interceptor do apiClient
        expect(toast.error).not.toHaveBeenCalled();
        expect(screen.getByText('Pausado')).toBeInTheDocument();

        consoleError.mockRestore();
    });
});
