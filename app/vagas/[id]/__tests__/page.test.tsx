import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import DetalhesVagaPage from '../page';
import { fetchJobOfferById, checkJobApplication, applyToJob } from '@/lib/data-service';
import { useAuth } from '@/lib/auth-context';
import { useRouter, useParams } from 'next/navigation';
import apiClient from '@/lib/api-service';

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
    fetchJobOfferById: jest.fn(),
    checkJobApplication: jest.fn(),
    applyToJob: jest.fn(),
}));

// Mock API Client
jest.mock('@/lib/api-service', () => ({
    get: jest.fn(),
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

jest.mock('@/components/ui/use-toast', () => ({
    useToast: () => ({
        toast: jest.fn(),
    }),
}));

describe('DetalhesVagaPage', () => {
    const mockRouter = {
        push: jest.fn(),
    };

    const mockParams = { id: 'job123' };

    const mockUser = {
        id: 'candidate123',
    };

    const mockJob = {
        id: 'job123',
        employerId: 'employer123',
        employerName: 'Empresa Teste',
        title: 'Vaga Publica de Teste',
        description: 'Descrição detalhada da vaga.',
        category: 'Audio',
        jobType: 'freelance',
        locationType: 'on_site',
        city: 'São Paulo',
        state: 'SP',
        isActive: true,
        createdAt: new Date().toISOString(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (useRouter as jest.Mock).mockReturnValue(mockRouter);
        (useParams as jest.Mock).mockReturnValue(mockParams);
        (useAuth as jest.Mock).mockReturnValue({
            userProfile: mockUser,
        });
        (fetchJobOfferById as jest.Mock).mockResolvedValue(mockJob);
        (checkJobApplication as jest.Mock).mockResolvedValue(false);
        (apiClient.get as jest.Mock).mockResolvedValue({ data: { averageRating: 4.5, totalReviews: 12 } });
    });

    it('renders job details correctly', async () => {
        render(<DetalhesVagaPage />);

        await waitFor(() => {
            expect(screen.getByText('Vaga Publica de Teste')).toBeInTheDocument();
        });

        expect(screen.getByText('Empresa Teste')).toBeInTheDocument();
        expect(screen.getByText('Descrição detalhada da vaga.')).toBeInTheDocument();
        expect(screen.getByText('São Paulo/SP')).toBeInTheDocument();
    });

    it('allows a user to apply for a job', async () => {
        (applyToJob as jest.Mock).mockResolvedValue(true);
        render(<DetalhesVagaPage />);

        await waitFor(() => {
            expect(screen.getByText('Vaga Publica de Teste')).toBeInTheDocument();
        });

        const applyButton = screen.getAllByRole('button', { name: /candidatar-se/i })[0];
        fireEvent.click(applyButton);

        await waitFor(() => {
            expect(applyToJob).toHaveBeenCalledWith('job123', 'candidate123');
            expect(mockRouter.push).toHaveBeenCalledWith('/dashboard/candidaturas');
        });
    });

    it('redirects to login if non-authenticated user tries to apply', async () => {
        (useAuth as jest.Mock).mockReturnValue({
            userProfile: null,
        });

        render(<DetalhesVagaPage />);

        await waitFor(() => {
            expect(screen.getByText('Vaga Publica de Teste')).toBeInTheDocument();
        });

        const applyButton = screen.getAllByRole('button', { name: /candidatar-se/i })[0];
        fireEvent.click(applyButton);

        expect(mockRouter.push).toHaveBeenCalledWith('/login');
    });

    it('shows "Já Candidatado" if user has already applied', async () => {
        (checkJobApplication as jest.Mock).mockResolvedValue(true);

        render(<DetalhesVagaPage />);

        await waitFor(() => {
            expect(screen.getAllByText('Já Candidatado').length).toBeGreaterThan(0);
        });

        const applyButton = screen.getAllByRole('button', { name: /já candidatado/i })[0];
        expect(applyButton).toBeDisabled();
    });
});
