import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import CandidatosVagaPage from '../page';
import { fetchJobCandidates, fetchJobOfferById, updateJobApplicationStatus, updateJobStatus } from '@/lib/data-service';
import { useAuth } from '@/lib/auth-context';
import { useRouter, useParams } from 'next/navigation';

// Mock Next.js router and params
jest.mock('next/navigation', () => ({
    useRouter: jest.fn(),
    useParams: jest.fn(),
}));

// Mock Auth Context
jest.mock('@/lib/auth-context', () => ({
    useAuth: jest.fn(),
}));

// Mock Data Service
jest.mock('@/lib/data-service', () => ({
    fetchJobCandidates: jest.fn(),
    fetchJobOfferById: jest.fn(),
    updateJobApplicationStatus: jest.fn(),
    updateJobStatus: jest.fn(),
}));

// Mock components
jest.mock('@/components/header', () => ({
    Header: () => <div data-testid="mock-header">Header</div>,
}));

jest.mock('@/components/footer', () => ({
    Footer: () => <div data-testid="mock-footer">Footer</div>,
}));

jest.mock('@/components/ui/use-toast', () => ({
    useToast: () => ({
        toast: jest.fn(),
    }),
}));

describe('CandidatosVagaPage', () => {
    const mockRouter = {
        push: jest.fn(),
    };

    const mockParams = { id: 'job123' };

    const mockUser = {
        id: 'employer123',
        email: 'employer@example.com',
    };

    const mockJob = {
        id: 'job123',
        employerId: 'employer123',
        title: 'Vaga de Teste',
        status: 'open',
        isActive: true,
    };

    const mockCandidates = [
        {
            id: 'app1',
            candidateId: 'cand1',
            status: 'pending',
            createdAt: new Date().toISOString(),
            message: 'Tenho interesse na vaga',
            profile: {
                id: 'cand1',
                displayName: 'João Silva',
                specialty: 'Desenvolvedor',
                city: 'São Paulo',
                state: 'SP',
                averageRating: 4.5,
                totalReviews: 10,
            },
        },
        {
            id: 'app2',
            candidateId: 'cand2',
            status: 'accepted',
            createdAt: new Date().toISOString(),
            profile: {
                id: 'cand2',
                displayName: 'Maria Souza',
                specialty: 'Designer',
                city: 'Rio de Janeiro',
                state: 'RJ',
                averageRating: 5.0,
                totalReviews: 5,
            },
        },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        (useRouter as jest.Mock).mockReturnValue(mockRouter);
        (useParams as jest.Mock).mockReturnValue(mockParams);
        (useAuth as jest.Mock).mockReturnValue({
            userProfile: mockUser,
            loading: false,
        });
        (fetchJobOfferById as jest.Mock).mockResolvedValue(mockJob);
        (fetchJobCandidates as jest.Mock).mockResolvedValue(mockCandidates);
    });

    it('redirects to login if user is not authenticated', async () => {
        (useAuth as jest.Mock).mockReturnValue({
            userProfile: null,
            loading: false,
        });

        render(<CandidatosVagaPage />);

        await waitFor(() => {
            expect(mockRouter.push).toHaveBeenCalledWith('/login');
        });
    });

    it('redirects to dashboard if job does not belong to user', async () => {
        (fetchJobOfferById as jest.Mock).mockResolvedValue({
            ...mockJob,
            employerId: 'other_user',
        });

        render(<CandidatosVagaPage />);

        await waitFor(() => {
            expect(mockRouter.push).toHaveBeenCalledWith('/dashboard/vagas');
        });
    });

    it('renders candidate cards correctly', async () => {
        render(<CandidatosVagaPage />);

        await waitFor(() => {
            expect(screen.getByText(/João Silva/i)).toBeInTheDocument();
            expect(screen.getByText(/Maria Souza/i)).toBeInTheDocument();
            expect(screen.getByText(/Tenho interesse na vaga/i)).toBeInTheDocument();
        });

        expect(screen.getByText('Aprovado')).toBeInTheDocument();
        expect(screen.getByText('Pendente')).toBeInTheDocument();
    });

    it('approves a candidate', async () => {
        (updateJobApplicationStatus as jest.Mock).mockResolvedValue(true);
        render(<CandidatosVagaPage />);

        await waitFor(() => {
            expect(screen.getByText(/João Silva/i)).toBeInTheDocument();
        });

        const approveButton = screen.getByRole('button', { name: /aprovar/i });
        fireEvent.click(approveButton);

        await waitFor(() => {
            expect(updateJobApplicationStatus).toHaveBeenCalledWith('app1', 'accepted');
        });
    });

    it('rejects a candidate', async () => {
        (updateJobApplicationStatus as jest.Mock).mockResolvedValue(true);
        render(<CandidatosVagaPage />);

        await waitFor(() => {
            expect(screen.getByText(/João Silva/i)).toBeInTheDocument();
        });

        const rejectButton = screen.getByRole('button', { name: /rejeitar/i });
        fireEvent.click(rejectButton);

        await waitFor(() => {
            expect(updateJobApplicationStatus).toHaveBeenCalledWith('app1', 'rejected');
        });
    });

    it('filters candidates by status tab', async () => {
        render(<CandidatosVagaPage />);

        await waitFor(() => {
            expect(screen.getByText(/João Silva/i)).toBeInTheDocument();
        });

        // Click on "Aprovados" tab
        const approvedTab = screen.getByRole('tab', { name: /aprovados/i });
        fireEvent.click(approvedTab);

        await waitFor(() => {
            expect(screen.queryByText(/João Silva/i)).not.toBeInTheDocument();
            expect(screen.getByText('Maria Souza')).toBeInTheDocument();
        });
    });

    it('concludes the job from the candidate page', async () => {
        (updateJobStatus as jest.Mock).mockResolvedValue(true);
        render(<CandidatosVagaPage />);

        await waitFor(() => {
            expect(screen.getByText(/João Silva/i)).toBeInTheDocument();
        });

        const concludeButton = screen.getByRole('button', { name: /concluir vaga/i });
        fireEvent.click(concludeButton);

        // Verify alert dialog
        expect(screen.getByText(/Concluir Vaga\?/i)).toBeInTheDocument();

        const confirmButton = screen.getByRole('button', { name: /confirmar conclusão/i });
        fireEvent.click(confirmButton);

        await waitFor(() => {
            expect(updateJobStatus).toHaveBeenCalledWith('job123', 'closed');
            expect(screen.getByText(/reabrir vaga/i)).toBeInTheDocument();
        });
    });
});
