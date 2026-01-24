import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import MinhasVagasPage from '../page';
import { fetchUserJobOffers, deleteJobOffer, updateJobStatus } from '@/lib/data-service';
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
    fetchUserJobOffers: jest.fn(),
    deleteJobOffer: jest.fn(),
    updateJobStatus: jest.fn(),
    bulkUpdateJobStatus: jest.fn(),
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

// Mock framer-motion
jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('MinhasVagasPage', () => {
    const mockRouter = {
        push: jest.fn(),
    };

    const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        displayName: 'Test User',
    };

    const mockVagas = [
        {
            id: '1',
            employerId: 'user123',
            employerName: 'Test User',
            title: 'Vaga de Desenvolvedor Frontend',
            description: 'Trabalhar com React e Next.js',
            category: 'Desenvolvimento',
            jobType: 'full_time',
            locationType: 'remote',
            isActive: true,
            status: 'open',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            id: '2',
            employerId: 'user123',
            employerName: 'Test User',
            title: 'Vaga de Designer UI/UX',
            description: 'Trabalhar com Figma',
            category: 'Design',
            jobType: 'freelance',
            locationType: 'hybrid',
            city: 'São Paulo',
            state: 'SP',
            isActive: false,
            status: 'paused',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        (useRouter as jest.Mock).mockReturnValue(mockRouter);
        (useAuth as jest.Mock).mockReturnValue({
            userProfile: mockUser,
            loading: false,
        });
        (fetchUserJobOffers as jest.Mock).mockResolvedValue(mockVagas);
    });

    it('redirects to login if user is not authenticated', async () => {
        (useAuth as jest.Mock).mockReturnValue({
            userProfile: null,
            loading: false,
        });

        render(<MinhasVagasPage />);

        expect(mockRouter.push).toHaveBeenCalledWith('/login');
    });

    it('renders loading state initially', () => {
        (fetchUserJobOffers as jest.Mock).mockReturnValue(new Promise(() => { }));

        render(<MinhasVagasPage />);

        // O componente renderiza esqueletos (animate-pulse) quando loadingVagas é true
        // ou um spinner central quando auth.loading é true.
        // Como o Mock do useAuth retorna loading: false no setup inicial, 
        // ele cai no loadingVagas do useEffect.
        // Vamos procurar os esqueletos de Card.
        const skeletons = document.querySelectorAll('.animate-pulse');
        expect(skeletons.length).toBeGreaterThan(0);
    });

    it('renders job offers after loading', async () => {
        render(<MinhasVagasPage />);

        await waitFor(() => {
            expect(screen.getByText('Vaga de Desenvolvedor Frontend')).toBeInTheDocument();
            expect(screen.getByText('Vaga de Designer UI/UX')).toBeInTheDocument();
        });

        expect(screen.getByText('Tempo Integral')).toBeInTheDocument();
        expect(screen.getByText('Freelance')).toBeInTheDocument();
    });

    it('shows empty state when user has no job offers', async () => {
        (fetchUserJobOffers as jest.Mock).mockResolvedValue([]);

        render(<MinhasVagasPage />);

        await waitFor(() => {
            expect(screen.getByText('Nenhuma vaga publicada')).toBeInTheDocument();
        });

        expect(screen.getByText('Criar Primeira Vaga')).toBeInTheDocument();
    });

    it('opens delete confirmation modal and deletes a job', async () => {
        (deleteJobOffer as jest.Mock).mockResolvedValue(undefined);
        render(<MinhasVagasPage />);

        await waitFor(() => {
            expect(screen.getByText('Vaga de Desenvolvedor Frontend')).toBeInTheDocument();
        });

        // Click the dropdown/more vertical button first
        // Em desktops, existem botões de ação direta ou dropdown.
        // Vamos procurar pelo botão de Dropdown
        const dropdownTriggers = screen.getAllByRole('button', { name: /ações/i });
        fireEvent.click(dropdownTriggers[0]);

        // Now click delete
        // Since our mocks render all dropdown contents, we need to pick the specific one for this job.
        // Or simply pick the first one found.
        const deleteButtons = screen.getAllByText('Excluir Vaga');
        fireEvent.click(deleteButtons[0]);

        // Verify modal is open
        expect(screen.getByText(/Você tem certeza\?/i)).toBeInTheDocument();

        // Confirm delete
        const confirmButton = screen.getByText('Confirmar Exclusão');
        fireEvent.click(confirmButton);

        await waitFor(() => {
            expect(deleteJobOffer).toHaveBeenCalledWith('1');
            expect(screen.queryByText('Vaga de Desenvolvedor Frontend')).not.toBeInTheDocument();
        });
    });

    it('toggles job status (pause/resume)', async () => {
        (updateJobStatus as jest.Mock).mockResolvedValue(true);
        render(<MinhasVagasPage />);

        await waitFor(() => {
            expect(screen.getByText('Vaga de Desenvolvedor Frontend')).toBeInTheDocument();
        });

        // Vaga 1 is 'open' and 'isActive: true'
        // Let's pause it.
        const dropdownTriggers = screen.getAllByRole('button', { name: /ações/i });
        fireEvent.click(dropdownTriggers[0]);

        const pauseButton = screen.getByText('Pausar Vaga');
        fireEvent.click(pauseButton);

        await waitFor(() => {
            expect(updateJobStatus).toHaveBeenCalledWith('1', 'paused');
            // Check status update in UI if possible or at least call
        });
    });

    it('handles bulk selection and actions', async () => {
        render(<MinhasVagasPage />);

        await waitFor(() => {
            expect(screen.getByText('Vaga de Desenvolvedor Frontend')).toBeInTheDocument();
        });

        // Select all
        const selectAllCheckbox = screen.getByLabelText(/Selecionar todas/i);
        fireEvent.click(selectAllCheckbox);

        // Check if floating action bar appears
        expect(screen.getByText('2 itens selecionados')).toBeInTheDocument();

        // Try a bulk action like 'Pausar'
        // Try a bulk action like 'Pausar'
        // Note: The bulk action bar renders both mobile and desktop versions (hidden via CSS), so we get multiple buttons.
        const pauseBulkButtons = screen.getAllByRole('button', { name: /pausar/i });
        fireEvent.click(pauseBulkButtons[0]);

        await waitFor(() => {
            // bulkUpdateJobStatus specifically
            const { bulkUpdateJobStatus: mockBulkUpdate } = require('@/lib/data-service');
            expect(mockBulkUpdate).toHaveBeenCalled();
        });
    });
});
