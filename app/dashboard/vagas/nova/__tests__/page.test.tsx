import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import NovaVagaPage from '../page';
import { createJobOffer, fetchSpecialties } from '@/lib/data-service';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

// Mock Next.js router
jest.mock('next/navigation', () => ({
    useRouter: jest.fn(),
}));

// Mock Auth Context
jest.mock('@/lib/auth-context', () => ({
    useAuth: jest.fn(),
}));

// Mock Data Service
jest.mock('@/lib/data-service', () => ({
    createJobOffer: jest.fn(),
    fetchSpecialties: jest.fn(),
}));

// Mock components
jest.mock('@/components/header', () => ({
    Header: () => <div data-testid="mock-header">Header</div>,
}));

jest.mock('@/components/footer', () => ({
    Footer: () => <div data-testid="mock-footer">Footer</div>,
}));

jest.mock('@/components/scroll-reveal', () => ({
    ScrollReveal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('NovaVagaPage', () => {
    const mockRouter = {
        push: jest.fn(),
        back: jest.fn(),
    };

    const mockUser = {
        id: 'employer123',
        email: 'employer@example.com',
    };

    const mockSpecialties = [
        { id: '1', name: 'Fotógrafo' },
        { id: '2', name: 'Videomaker' },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        (useRouter as jest.Mock).mockReturnValue(mockRouter);
        (useAuth as jest.Mock).mockReturnValue({
            userProfile: mockUser,
            loading: false,
        });
        (fetchSpecialties as jest.Mock).mockResolvedValue(mockSpecialties);
    });

    it('redirects to login if user is not authenticated', async () => {
        (useAuth as jest.Mock).mockReturnValue({
            userProfile: null,
            loading: false,
        });

        render(<NovaVagaPage />);

        await waitFor(() => {
            expect(mockRouter.push).toHaveBeenCalledWith('/login');
        });
    });

    it('renders the form correctly', async () => {
        render(<NovaVagaPage />);

        await waitFor(() => {
            expect(screen.getByLabelText(/Título da Vaga \*/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/Descrição da Vaga \*/i)).toBeInTheDocument();
        });

        expect(screen.getByText('Publicar Vaga')).toBeInTheDocument();
    });

    it('submits the form successfully', async () => {
        (createJobOffer as jest.Mock).mockResolvedValue({ id: 'new_job_123' });
        render(<NovaVagaPage />);

        await waitFor(() => {
            expect(screen.getByLabelText(/Título da Vaga \*/i)).toBeInTheDocument();
        });

        // Fill required fields
        fireEvent.change(screen.getByLabelText(/Título da Vaga \*/i), { target: { value: 'Nova Vaga de Teste' } });
        fireEvent.change(screen.getByLabelText(/Descrição da Vaga \*/i), { target: { value: 'Esta é uma descrição de teste com mais de 20 caracteres.' } });

        // Submit form
        const submitButton = screen.getByText('Publicar Vaga');
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(createJobOffer).toHaveBeenCalled();
            expect(screen.getByText(/Vaga publicada com sucesso/i)).toBeInTheDocument();
        });

        await waitFor(() => {
            expect(mockRouter.push).toHaveBeenCalledWith('/dashboard/vagas');
        }, { timeout: 2000 });
    });

    it('shows error message on failure', async () => {
        (createJobOffer as jest.Mock).mockRejectedValue({
            response: { data: { message: 'Erro ao criar vaga' } }
        });
        render(<NovaVagaPage />);

        await waitFor(() => {
            expect(screen.getByLabelText(/Título da Vaga \*/i)).toBeInTheDocument();
        });

        fireEvent.change(screen.getByLabelText(/Título da Vaga \*/i), { target: { value: 'Falha de Teste' } });
        fireEvent.change(screen.getByLabelText(/Descrição da Vaga \*/i), { target: { value: 'Descrição de teste longa o suficiente.' } });

        const submitButton = screen.getByText('Publicar Vaga');
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText('Erro ao criar vaga')).toBeInTheDocument();
        });
    });
});
