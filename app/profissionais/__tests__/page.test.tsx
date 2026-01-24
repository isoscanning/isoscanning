import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ProfissionaisPage from '../page';
import { fetchProfessionals, fetchSpecialties } from '@/lib/data-service';

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
    fetchProfessionals: jest.fn(),
    fetchSpecialties: jest.fn(),
}));

// Mock the components that use browser APIs or complex logic not needed for unit tests
jest.mock('@/components/scroll-reveal', () => ({
    ScrollReveal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/typing-text', () => ({
    CountUp: ({ end }: { end: number }) => <span>{end}</span>,
}));

// Mock SearchBar to test integration without needing full DOM for it
jest.mock('@/components/search-bar', () => ({
    SearchBar: ({ onSearch }: { onSearch: Function }) => (
        <div>
            <input
                placeholder="Mock City Input"
                onChange={(e) => onSearch({ city: e.target.value, date: undefined, specialty: 'Todos' })}
            />
            <button onClick={() => onSearch({ city: 'São Paulo', date: undefined, specialty: 'Todos' })}>
                Mock Search Button
            </button>
        </div>
    ),
}));

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
}));

describe('ProfissionaisPage', () => {
    const mockProfessionals = [
        {
            id: '1',
            displayName: 'João Silva',
            specialty: 'Fotógrafo',
            city: 'São Paulo',
            avatarUrl: 'https://example.com/avatar1.jpg',
            averageRating: 5.0,
        },
        {
            id: '2',
            displayName: 'Maria Santos',
            specialty: 'Videomaker',
            city: 'Rio de Janeiro',
            avatarUrl: 'https://example.com/avatar2.jpg',
            averageRating: 4.8,
        },
    ];

    const mockSpecialties = [
        { id: '1', name: 'Fotógrafo' },
        { id: '2', name: 'Videomaker' },
    ];

    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();
    });

    it('renders loading state initially', async () => {
        (fetchProfessionals as jest.Mock).mockReturnValue(new Promise(() => { })); // Never resolves to keep loading state
        (fetchSpecialties as jest.Mock).mockResolvedValue(mockSpecialties);

        render(<ProfissionaisPage />);

        // Check for loading skeletons or text
        expect(screen.getByText(/Profissionais Disponíveis/i)).toBeInTheDocument();
        expect(screen.getByText('Carregando...')).toBeInTheDocument();
    });

    it('renders professionals after loading', async () => {
        (fetchProfessionals as jest.Mock).mockResolvedValue(mockProfessionals);
        (fetchSpecialties as jest.Mock).mockResolvedValue(mockSpecialties);

        render(<ProfissionaisPage />);

        await waitFor(() => {
            expect(screen.getByText('João Silva')).toBeInTheDocument();
            expect(screen.getByText('Maria Santos')).toBeInTheDocument();
        });

        expect(screen.getByText('2 profissionais encontrados')).toBeInTheDocument();
    });

    it('filters professionals by city', async () => {
        (fetchProfessionals as jest.Mock).mockResolvedValue(mockProfessionals);
        (fetchSpecialties as jest.Mock).mockResolvedValue(mockSpecialties);

        render(<ProfissionaisPage />);

        // Wait for initial load
        await waitFor(() => {
            expect(screen.getByText('João Silva')).toBeInTheDocument();
            expect(screen.getByText('Maria Santos')).toBeInTheDocument();
        });

        // Simulate search via mocked button
        const searchButton = screen.getByText('Mock Search Button');
        fireEvent.click(searchButton);

        // Should only show João Silva (São Paulo)
        await waitFor(() => {
            expect(screen.getByText('João Silva')).toBeInTheDocument();
            expect(screen.queryByText('Maria Santos')).not.toBeInTheDocument();
        });
    });
});
