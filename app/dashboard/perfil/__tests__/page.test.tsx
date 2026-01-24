import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import PerfilPage from '../page';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-service';
import * as dataService from '@/lib/data-service';

// Mock Next.js router
jest.mock('next/navigation', () => ({
    useRouter: jest.fn(),
}));

// Mock Auth Context
jest.mock('@/lib/auth-context', () => ({
    useAuth: jest.fn(),
}));

// Mock API client
jest.mock('@/lib/api-service', () => ({
    get: jest.fn(),
    put: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
}));

// Mock Data Service
jest.mock('@/lib/data-service', () => ({
    fetchPortfolio: jest.fn(),
    createPortfolioItem: jest.fn(),
    deletePortfolioItem: jest.fn(),
    uploadPortfolioItemImage: jest.fn(),
    fetchAvailability: jest.fn(),
    createAvailability: jest.fn(),
    deleteAvailability: jest.fn(),
    deleteAvailabilities: jest.fn(),
    fetchSpecialties: jest.fn(),
}));

// Mock components
jest.mock('@/components/header', () => ({
    Header: () => <div data-testid="mock-header">Header</div>,
}));

jest.mock('@/components/footer', () => ({
    Footer: () => <div data-testid="mock-footer">Footer</div>,
}));

// Mock window.URL.createObjectURL
window.URL.createObjectURL = jest.fn(() => 'blob:url');
window.URL.revokeObjectURL = jest.fn();

describe('PerfilPage', () => {
    const mockRouter = {
        push: jest.fn(),
    };

    const mockUser = {
        id: 'user123',
        displayName: 'Test User',
        userType: 'professional',
        avatarUrl: 'old-avatar.jpg',
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
            updateProfile: jest.fn().mockResolvedValue({}),
        });
        (dataService.fetchSpecialties as jest.Mock).mockResolvedValue(mockSpecialties);
        (dataService.fetchPortfolio as jest.Mock).mockResolvedValue([]);
        (dataService.fetchAvailability as jest.Mock).mockResolvedValue([]);
        (apiClient.get as jest.Mock).mockResolvedValue({ data: { ...mockUser } });

        // Mock countries fetch
        global.fetch = jest.fn().mockResolvedValue({
            json: jest.fn().mockResolvedValue([
                { cca2: 'BR', flag: '🇧🇷', idd: { root: '+', suffixes: ['55'] }, name: { common: 'Brazil' } }
            ])
        });
    });

    it('renders correctly and loads data', async () => {
        render(<PerfilPage />);

        await waitFor(() => {
            expect(screen.getByText('Meu Perfil')).toBeInTheDocument();
            expect(screen.getByText('Dados Pessoais')).toBeInTheDocument();
        });

        expect(dataService.fetchSpecialties).toHaveBeenCalled();
        expect(apiClient.get).toHaveBeenCalledWith('/profiles/user123');
    });

    it('submits personal data form correctly', async () => {
        const { updateProfile } = useAuth() as any;
        render(<PerfilPage />);

        await waitFor(() => {
            expect(screen.getByLabelText(/Nome Completo \*/i)).toBeInTheDocument();
        });

        fireEvent.change(screen.getByLabelText(/Nome Completo \*/i), { target: { value: 'Updated Name' } });
        fireEvent.change(screen.getByLabelText(/Cidade \*/i), { target: { value: 'Juiz de Fora' } });

        // Description is required for saving if it's professional? actually validation is mostly for publishing.
        // But let's fill it.
        fireEvent.change(screen.getByLabelText(/Descrição \/ Bio \*/i), { target: { value: 'Test description' } });

        const saveButton = screen.getByText('Salvar Alterações');
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(updateProfile).toHaveBeenCalled();
        });
    });

    it('switches tabs to Portfolio', async () => {
        render(<PerfilPage />);

        await waitFor(() => {
            expect(screen.getByText('Portfólio')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Portfólio'));

        await waitFor(() => {
            expect(screen.getByText('Seu Portfólio')).toBeInTheDocument();
        });
    });

    it('switches tabs to Agenda', async () => {
        render(<PerfilPage />);

        await waitFor(() => {
            expect(screen.getByText('Agenda')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Agenda'));

        await waitFor(() => {
            expect(screen.getByText('Minha Disponibilidade')).toBeInTheDocument();
        });
    });
});
