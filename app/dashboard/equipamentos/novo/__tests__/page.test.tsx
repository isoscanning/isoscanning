import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NovoEquipamentoPage from '../page';
import { useAuth } from '@/lib/auth-context';
import { createEquipment, uploadEquipmentImages } from '@/lib/data-service';
import { useRouter } from 'next/navigation';

// Mock dependencies
jest.mock('next/navigation', () => ({
    useRouter: jest.fn(),
}));

jest.mock('@/lib/auth-context', () => ({
    useAuth: jest.fn(),
}));

jest.mock('@/lib/data-service', () => ({
    createEquipment: jest.fn(),
    uploadEquipmentImages: jest.fn(),
}));

jest.mock('@/components/header', () => ({ Header: () => <div /> }));
jest.mock('@/components/footer', () => ({ Footer: () => <div /> }));
jest.mock('@/components/scroll-reveal', () => ({ ScrollReveal: ({ children }: any) => <div>{children}</div> }));

// UI mocks
jest.mock('@/components/ui/select', () => ({
    Select: ({ onValueChange, value, children }: any) => (
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

jest.mock('@/components/ui/label', () => ({
    Label: ({ children, htmlFor }: any) => <label htmlFor={htmlFor}>{children}</label>,
}));

jest.mock('@/components/ui/alert', () => ({
    Alert: ({ children }: any) => <div>{children}</div>,
    AlertDescription: ({ children }: any) => <div>{children}</div>,
}));

describe('NovoEquipamentoPage', () => {
    const mockRouter = { push: jest.fn(), back: jest.fn() };

    beforeEach(() => {
        jest.clearAllMocks();
        (useRouter as jest.Mock).mockReturnValue(mockRouter);
        (useAuth as jest.Mock).mockReturnValue({
            userProfile: { id: 'user1', displayName: 'User Test' },
            loading: false
        });
    });

    it('submits form successfully', async () => {
        (uploadEquipmentImages as jest.Mock).mockResolvedValue(['img1.jpg']);
        (createEquipment as jest.Mock).mockResolvedValue({ id: 'new-eq' });

        const { container } = render(<NovoEquipamentoPage />);

        // Fill form
        fireEvent.change(container.querySelector('#name')!, { target: { value: 'Camera Teste' } });
        fireEvent.change(container.querySelector('#description')!, { target: { value: 'Descricao Teste' } });
        fireEvent.change(container.querySelector('#city')!, { target: { value: 'São Paulo' } });

        // Find by testid
        const selects = await screen.findAllByTestId('mock-select');
        fireEvent.change(selects[0], { target: { value: 'Câmeras' } });
        fireEvent.change(selects[1], { target: { value: 'used' } });
        fireEvent.change(selects[2], { target: { value: 'sale' } });
        fireEvent.change(selects[3], { target: { value: 'SP' } });

        fireEvent.change(container.querySelector('input[type="number"]')!, { target: { value: '1000' } });

        const form = container.querySelector('form');
        fireEvent.submit(form!);

        await waitFor(() => {
            expect(createEquipment).toHaveBeenCalled();
            expect(mockRouter.push).toHaveBeenCalledWith('/dashboard/equipamentos');
        }, { timeout: 3000 });
    });

    it('shows error message on failure', async () => {
        (createEquipment as jest.Mock).mockRejectedValue(new Error('Erro ao criar'));

        const { container } = render(<NovoEquipamentoPage />);

        fireEvent.change(container.querySelector('#name')!, { target: { value: 'Camera Teste' } });
        fireEvent.change(container.querySelector('#description')!, { target: { value: 'Descricao' } });
        fireEvent.change(container.querySelector('#city')!, { target: { value: 'SP' } });

        const selects = await screen.findAllByTestId('mock-select');
        fireEvent.change(selects[0], { target: { value: 'Câmeras' } });
        fireEvent.change(selects[1], { target: { value: 'used' } });
        fireEvent.change(selects[2], { target: { value: 'sale' } });
        fireEvent.change(selects[3], { target: { value: 'SP' } });

        const form = container.querySelector('form');
        fireEvent.submit(form!);

        await waitFor(() => {
            expect(screen.getByText(/Erro ao salvar equipamento/i)).toBeInTheDocument();
        });
    });
});
