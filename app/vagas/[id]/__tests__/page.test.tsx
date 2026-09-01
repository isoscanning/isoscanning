import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import DetalhesVagaPage from '../job-offer-client';
import { fetchJobOfferById, fetchJobApplication, applyToJob } from '@/lib/data-service';
import { useAuth } from '@/lib/auth-context';
import { useRouter, useParams } from 'next/navigation';
import { trackEvent } from '@/lib/analytics';
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

// Mock Data Service.
// The page loads the job with fetchJobOfferById and, when a user is logged in,
// resolves the current application with fetchJobApplication (JobApplication | null).
jest.mock('@/lib/data-service', () => ({
    fetchJobOfferById: jest.fn(),
    fetchJobApplication: jest.fn(),
    applyToJob: jest.fn(),
}));

// Mock analytics (trackEvent is fired on job view)
jest.mock('@/lib/analytics', () => ({
    trackEvent: jest.fn(),
}));

// Mock API Client (default export, used for employer review stats)
jest.mock('@/lib/api-service', () => ({
    __esModule: true,
    default: {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
    },
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

    const mockApplication = {
        id: 'app123',
        jobOfferId: 'job123',
        candidateId: 'candidate123',
        status: 'pending' as const,
        counterProposal: 750,
        createdAt: new Date().toISOString(),
        jobOffer: {
            id: 'job123',
            title: 'Vaga Publica de Teste',
            employerId: 'employer123',
            employerName: 'Empresa Teste',
            jobType: 'freelance',
            locationType: 'on_site',
        },
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (useRouter as jest.Mock).mockReturnValue(mockRouter);
        (useParams as jest.Mock).mockReturnValue(mockParams);
        (useAuth as jest.Mock).mockReturnValue({
            userProfile: mockUser,
        });
        (fetchJobOfferById as jest.Mock).mockResolvedValue(mockJob);
        (fetchJobApplication as jest.Mock).mockResolvedValue(null);
        (apiClient.get as jest.Mock).mockResolvedValue({ data: { averageRating: 4.5, totalReviews: 12 } });
    });

    it('renders job details correctly', async () => {
        render(<DetalhesVagaPage />);

        expect((await screen.findAllByText(/Vaga Publica de Teste/i)).length).toBeGreaterThan(0);

        expect(fetchJobOfferById).toHaveBeenCalledWith('job123');
        expect(fetchJobApplication).toHaveBeenCalledWith('job123', 'candidate123');
        expect(apiClient.get).toHaveBeenCalledWith('/reviews/stats/employer123');
        expect(trackEvent).toHaveBeenCalledWith(
            expect.objectContaining({ action: 'view_job_offer', label: 'Vaga Publica de Teste' })
        );

        expect(screen.getAllByText(/Empresa Teste/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/Descrição detalhada da vaga/i)).toBeInTheDocument();
        expect(screen.getByText(/São Paulo\/SP/i)).toBeInTheDocument();

        // Employer review stats fetched via apiClient
        await waitFor(() => {
            expect(screen.getByText('4.5')).toBeInTheDocument();
        });
        expect(screen.getByText(/12 avaliações/i)).toBeInTheDocument();
    });

    it('allows a user to apply for a job', async () => {
        (applyToJob as jest.Mock).mockResolvedValue(true);
        render(<DetalhesVagaPage />);

        await screen.findAllByText(/Vaga Publica de Teste/i);

        const applyButton = screen.getAllByRole('button', { name: /candidatar-se/i })[0];
        expect(applyButton).toBeEnabled();
        fireEvent.click(applyButton);

        await waitFor(() => {
            expect(applyToJob).toHaveBeenCalledWith('job123', 'candidate123');
            expect(mockRouter.push).toHaveBeenCalledWith('/dashboard/candidaturas');
        });

        // After applying the button switches to the applied state
        expect((await screen.findAllByRole('button', { name: /já candidatado/i })).length).toBeGreaterThan(0);
    });

    it('redirects to login if non-authenticated user tries to apply', async () => {
        (useAuth as jest.Mock).mockReturnValue({
            userProfile: null,
        });

        render(<DetalhesVagaPage />);

        await screen.findAllByText(/Vaga Publica de Teste/i);

        // No application lookup without a logged-in user
        expect(fetchJobApplication).not.toHaveBeenCalled();

        const applyButton = screen.getAllByRole('button', { name: /candidatar-se/i })[0];
        fireEvent.click(applyButton);

        expect(mockRouter.push).toHaveBeenCalledWith('/login');
        expect(applyToJob).not.toHaveBeenCalled();
    });

    it('shows "Já Candidatado" if user has already applied', async () => {
        (fetchJobApplication as jest.Mock).mockResolvedValue(mockApplication);

        render(<DetalhesVagaPage />);

        const appliedButtons = await screen.findAllByRole('button', { name: /já candidatado/i });
        expect(appliedButtons.length).toBeGreaterThan(0);
        appliedButtons.forEach((button) => expect(button).toBeDisabled());

        // The existing counter-proposal from the application is displayed
        expect(screen.getAllByText(/Minha Proposta: R\$ 750/i).length).toBeGreaterThan(0);

        // Clicking the disabled button must not re-apply
        fireEvent.click(appliedButtons[0]);
        expect(applyToJob).not.toHaveBeenCalled();
    });
});
