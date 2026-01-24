import '@testing-library/jest-dom'
import * as React from 'react'

// Provide dummy environment variables for Supabase in tests
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'dummy-key';

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
};

// Mock window.URL.createObjectURL
if (typeof window !== 'undefined') {
    window.URL.createObjectURL = jest.fn(() => 'blob:url');
    window.URL.revokeObjectURL = jest.fn();
}

// Mock scrollIntoView
if (typeof window !== 'undefined') {
    window.HTMLElement.prototype.scrollIntoView = jest.fn();
}

// Global Radix UI mock helper
const mockComponent = (name) => {
    const Component = React.forwardRef(({ children, ...props }, ref) => (
        <div data-testid={`radix-${name}`} {...props} ref={ref}>{children}</div>
    ));
    Component.displayName = name;
    return Component;
};

const mockSimple = (name) => {
    const Component = ({ children }) => <>{children}</>;
    Component.displayName = name;
    return Component;
};

// Mock Radix UI Portal
jest.mock('@radix-ui/react-portal', () => ({
    Root: mockSimple('PortalRoot'),
}));

// Mock @radix-ui/react-dropdown-menu
jest.mock('@radix-ui/react-dropdown-menu', () => ({
    Root: mockSimple('DropdownRoot'),
    Trigger: mockSimple('DropdownTrigger'),
    Portal: mockSimple('DropdownPortal'),
    Content: mockComponent('dropdown-content'),
    Item: React.forwardRef(({ children, onClick, onSelect, ...props }, ref) => (
        <div ref={ref} onClick={(e) => { onClick?.(e); onSelect?.(e); }} {...props}>{children}</div>
    )),
    Group: mockSimple('DropdownGroup'),
    Label: mockComponent('dropdown-label'),
    Separator: () => <hr />,
    CheckboxItem: mockComponent('dropdown-checkbox-item'),
    RadioGroup: mockSimple('DropdownRadioGroup'),
    RadioItem: mockComponent('dropdown-radio-item'),
    ItemIndicator: mockSimple('DropdownItemIndicator'),
    Sub: mockSimple('DropdownSub'),
    SubTrigger: mockSimple('DropdownSubTrigger'),
    SubContent: mockComponent('dropdown-sub-content'),
    Arrow: () => null,
}));

// Mock @radix-ui/react-alert-dialog
jest.mock('@radix-ui/react-alert-dialog', () => ({
    Root: ({ children, open }) => (open ? <>{children}</> : null),
    Trigger: mockSimple('AlertDialogTrigger'),
    Portal: mockSimple('AlertDialogPortal'),
    Overlay: mockComponent('alert-dialog-overlay'),
    Content: mockComponent('alert-dialog-content'),
    Title: ({ children, ...props }) => <h2 {...props}>{children}</h2>,
    Description: ({ children, ...props }) => <p {...props}>{children}</p>,
    Action: React.forwardRef(({ children, onClick, ...props }, ref) => (
        <button ref={ref} onClick={onClick} {...props}>{children}</button>
    )),
    Cancel: React.forwardRef(({ children, onClick, ...props }, ref) => (
        <button ref={ref} onClick={onClick} {...props}>{children}</button>
    )),
}));

// Mock @radix-ui/react-dialog
jest.mock('@radix-ui/react-dialog', () => ({
    Root: ({ children, open }) => (open ? <>{children}</> : null),
    Trigger: mockSimple('DialogTrigger'),
    Portal: mockSimple('DialogPortal'),
    Overlay: mockComponent('dialog-overlay'),
    Content: mockComponent('dialog-content'),
    Title: ({ children, ...props }) => <h2 {...props}>{children}</h2>,
    Description: ({ children, ...props }) => <p {...props}>{children}</p>,
    Close: React.forwardRef(({ children, ...props }, ref) => (
        <button ref={ref} {...props}>{children}</button>
    )),
}));

// Mock @radix-ui/react-select
jest.mock('@radix-ui/react-select', () => ({
    Root: mockSimple('SelectRoot'),
    Trigger: React.forwardRef(({ children, ...props }, ref) => (
        <button ref={ref} {...props}>{children}</button>
    )),
    Value: ({ children, placeholder }) => <span>{children || placeholder}</span>,
    Portal: mockSimple('SelectPortal'),
    Content: mockComponent('select-content'),
    Viewport: mockSimple('SelectViewport'),
    Item: React.forwardRef(({ children, onClick, onSelect, ...props }, ref) => (
        <div ref={ref} onClick={(e) => { onClick?.(e); onSelect?.(e); }} {...props}>{children}</div>
    )),
    ItemText: mockSimple('SelectItemText'),
    ItemIndicator: mockSimple('SelectItemIndicator'),
    Group: mockSimple('SelectGroup'),
    Label: mockComponent('select-label'),
    Separator: () => <hr />,
    ScrollUpButton: () => null,
    ScrollDownButton: () => null,
    Icon: mockSimple('SelectIcon'),
}));

// Mock @radix-ui/react-tabs
const TabsContext = React.createContext({ activeTab: '', onValueChange: () => { } });

jest.mock('@radix-ui/react-tabs', () => ({
    Root: ({ children, defaultValue, value, onValueChange }) => {
        const [internalActiveTab, setInternalActiveTab] = React.useState(value || defaultValue);

        React.useEffect(() => {
            if (value !== undefined) setInternalActiveTab(value);
        }, [value]);

        const handleValueChange = (newValue) => {
            if (value === undefined) setInternalActiveTab(newValue);
            onValueChange?.(newValue);
        };

        return (
            <TabsContext.Provider value={{ activeTab: internalActiveTab, onValueChange: handleValueChange }}>
                <div data-testid="radix-tabs-root" data-active-tab={internalActiveTab}>
                    {children}
                </div>
            </TabsContext.Provider>
        );
    },
    List: ({ children }) => <div data-testid="radix-tabs-list" role="tablist">{children}</div>,
    Trigger: ({ children, value }) => {
        const { activeTab, onValueChange } = React.useContext(TabsContext);
        const isActive = activeTab === value;
        return (
            <button
                data-radix-tab-trigger
                data-value={value}
                data-state={isActive ? 'active' : 'inactive'}
                role="tab"
                aria-selected={isActive}
                onClick={() => onValueChange(value)}
            >
                {children}
            </button>
        );
    },
    Content: ({ children, value }) => {
        const { activeTab } = React.useContext(TabsContext);
        if (activeTab !== value) return null;
        return (
            <div
                data-testid={`radix-tabs-content-${value}`}
                role="tabpanel"
            >
                {children}
            </div>
        );
    },
}));

// Mock framer-motion globally
const motionProxy = new Proxy({}, {
    get: (target, prop) => {
        if (typeof prop !== 'string') return undefined;

        // List of common motion elements
        const elements = ['div', 'span', 'section', 'p', 'h1', 'h2', 'h3', 'button', 'nav', 'a', 'img', 'li', 'ul', 'ol'];
        if (elements.includes(prop)) {
            const Component = React.forwardRef(({ children, initial, animate, exit, transition, variants, whileHover, whileTap, whileInView, viewport, ...props }, ref) => {
                return React.createElement(prop, { ...props, ref }, children);
            });
            Component.displayName = `motion.${prop}`;
            return Component;
        }
        return undefined;
    }
});

jest.mock('framer-motion', () => ({
    motion: motionProxy,
    AnimatePresence: ({ children }) => <>{children}</>,
    useScroll: () => ({ scrollYProgress: { onChange: jest.fn() } }),
    useTransform: () => (0),
    useSpring: () => (0),
    useInView: () => (true),
    useAnimation: () => ({ start: jest.fn(), stop: jest.fn() }),
}));
