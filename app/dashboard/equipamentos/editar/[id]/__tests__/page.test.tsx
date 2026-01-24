import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EditarEquipamentoPage from '../page';
import { useAuth } from '@/lib/auth-context';
import { fetchUserEquipments, updateEquipment, uploadEquipmentImages } from '@/lib/data-service';
import { useRouter, useParams } from 'next/navigation';

// Mocks
jest.mock('next/navigation', () => ({
    useRouter: jest.fn(),
    useParams: jest.fn(),
}));

jest.mock('@/lib/auth-context', () => ({
    useAuth: jest.fn(),
}));

jest.mock('@/lib/data-service', () => ({
    fetchUserEquipments: jest.fn(),
    updateEquipment: jest.fn(),
    uploadEquipmentImages: jest.fn(),
}));

jest.mock('@/components/header', () => ({ Header: () => <div /> }));
jest.mock('@/components/footer', () => ({ Footer: () => <div /> }));
jest.mock('@/components/scroll-reveal', () => ({ ScrollReveal: ({ children }: any) => <div>{children}</div> }));

// UI mocks
jest.mock('@/components/ui/select', () => ({
    Select: ({ onValueChange, value }: any) => (
        <select
            data-testid="mock-select"
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
        >
            <option value="">Select</option>
            <option value="Câmeras">Câmeras</option>
            <option value="used">used</option>
            <option value="sale">sale</option>
            <option value="SP">SP</option>
            <option value="new">new</option>
        </select>
    ),
    SelectContent: ({ children }: any) => <>{children}</>,
    SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
    SelectTrigger: ({ children }: any) => <>{children}</>,
    SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
}));

jest.mock('@/components/ui/textarea', () => ({
    Textarea: (props: any) => <textarea {...props} />,
}));

jest.mock('@/components/ui/input', () => ({
    Input: (props: any) => <input {...props} />,
}));

jest.mock('@/components/ui/button', () => ({
    Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

jest.mock('@/components/ui/card', () => ({
    Card: ({ children }: any) => <div>{children}</div>,
    CardHeader: ({ children }: any) => <div>{children}</div>,
    CardTitle: ({ children }: any) => <div>{children}</div>,
    CardDescription: ({ children }: any) => <div>{children}</div>,
    CardContent: ({ children }: any) => <div>{children}</div>,
}));

describe('EditarEquipamentoPage', () => {
    const mockRouter = { push: jest.fn(), back: jest.fn() };
    const mockEquipment = {
        id: 'eq1',
        name: 'Existing Camera',
        category: 'Câmeras',
        negotiationType: 'sale',
        condition: 'used',
        price: 500,
        city: 'São Paulo',
        state: 'SP',
        description: 'Existing Description',
        ownerId: 'user1',
        brand: 'Canon',
        model: 'EOS R5',
        isAvailable: true,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (useRouter as jest.Mock).mockReturnValue(mockRouter);
        (useParams as jest.Mock).mockReturnValue({ id: 'eq1' });
        (useAuth as jest.Mock).mockReturnValue({
            userProfile: { id: 'user1', displayName: 'User Test' },
            loading: false
        });
    });

    it('loads and displays equipment data', async () => {
        (fetchUserEquipments as jest.Mock).mockResolvedValue([mockEquipment]);

        render(<EditarEquipamentoPage />);

        await waitFor(() => {
            expect(screen.getByDisplayValue('Existing Camera')).toBeInTheDocument();
        });
    });

    it('updates equipment successfully', async () => {
        (fetchUserEquipments as jest.Mock).mockResolvedValue([mockEquipment]);
        (updateEquipment as jest.Mock).mockResolvedValue({ ...mockEquipment, name: 'Updated Name' });

        const { container } = render(<EditarEquipamentoPage />);

        await waitFor(() => {
            expect(screen.getByDisplayValue('Existing Camera')).toBeInTheDocument();
        });

        fireEvent.change(container.querySelector('#name')!, { target: { value: 'Updated Name' } });

        const form = container.querySelector('form');
        fireEvent.submit(form!);

        // Increase timeout to 3s to account for the 1.5s redirect delay
        await waitFor(() => {
            expect(updateEquipment).toHaveBeenCalledWith('eq1', expect.objectContaining({ name: 'Updated Name' }));
            expect(mockRouter.push).toHaveBeenCalledWith('/dashboard/equipamentos');
        }, { timeout: 3000 });
    });
});
