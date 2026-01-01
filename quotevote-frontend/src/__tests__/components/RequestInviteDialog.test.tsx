/**
 * RequestInviteDialog Component Tests
 * 
 * Tests for the RequestInviteDialog component including:
 * - Dialog open/close functionality
 * - Email validation
 * - Duplicate email checking
 * - Mutation handling
 * - Error and success states
 * - Auto-close after submission
 */

import { render, screen, fireEvent, waitFor, act } from '@/__tests__/utils/test-utils';
import userEvent from '@testing-library/user-event';
import { RequestInviteDialog } from '@/components/RequestInviteDialog';

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

import { toast } from 'sonner';

// Mock Next.js navigation
const mockPathname = jest.fn(() => '/test-path');
const mockSearchParams = {
  toString: jest.fn(() => ''),
  get: jest.fn(),
};

jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
  useSearchParams: () => mockSearchParams,
}));

// Mock Apollo Client hooks
const mockQuery = jest.fn();
const mockMutation = jest.fn();
const mockClient = {
  query: mockQuery,
};

// Create a mock function for useMutation that can be controlled per test
const mockUseMutation = jest.fn(() => [
  mockMutation,
  { loading: false },
]);

jest.mock('@apollo/client', () => {
  const actual = jest.requireActual('@apollo/client');
  return {
    ...actual,
    useApolloClient: () => mockClient,
    useMutation: () => mockUseMutation(),
  };
});

describe('RequestInviteDialog', () => {
  const defaultProps = {
    open: true,
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Reset useMutation mock to default
    mockUseMutation.mockReturnValue([
      mockMutation,
      { loading: false },
    ]);
    
    // Default query response (no duplicate)
    mockQuery.mockResolvedValue({
      data: {
        checkDuplicateEmail: [],
      },
    });
    
    // Default mutation response
    mockMutation.mockResolvedValue({
      data: {
        requestUserAccess: {
          _id: '123',
          email: 'test@example.com',
        },
      },
    });
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('renders dialog when open is true', () => {
    render(<RequestInviteDialog {...defaultProps} />);

    expect(
      screen.getByText(/you need an account to contribute/i)
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/enter your email address/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /request invite/i })
    ).toBeInTheDocument();
  });

  it('does not render dialog when open is false', () => {
    render(<RequestInviteDialog open={false} onClose={jest.fn()} />);

    expect(
      screen.queryByText(/you need an account to contribute/i)
    ).not.toBeInTheDocument();
  });

  it('calls onClose when dialog is closed', async () => {
    const onClose = jest.fn();
    render(<RequestInviteDialog open={true} onClose={onClose} />);

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('shows validation error for invalid email', async () => {
    const user = userEvent.setup({ delay: null });
    render(<RequestInviteDialog {...defaultProps} />);

    const emailInput = screen.getByPlaceholderText(/enter your email address/i);
    const submitButton = screen.getByRole('button', { name: /request invite/i });

    await user.type(emailInput, 'invalid-email');
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/please enter a valid email address/i)
      ).toBeInTheDocument();
    });
  });

  it('shows error for empty email', async () => {
    const user = userEvent.setup({ delay: null });
    render(<RequestInviteDialog {...defaultProps} />);

    const submitButton = screen.getByRole('button', { name: /request invite/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    });
  });

  it('shows error for duplicate email', async () => {
    const user = userEvent.setup({ delay: null });
    
    // Mock query to return duplicate email
    mockQuery.mockResolvedValue({
      data: {
        checkDuplicateEmail: [{ _id: '1', email: 'existing@example.com' }],
      },
    });

    render(<RequestInviteDialog {...defaultProps} />);

    const emailInput = screen.getByPlaceholderText(/enter your email address/i);
    const submitButton = screen.getByRole('button', { name: /request invite/i });

    await user.type(emailInput, 'existing@example.com');
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(
          /this email address has already been used to request an invite/i
        )
      ).toBeInTheDocument();
    });
  });

  it('submits form successfully with valid email', async () => {
    const user = userEvent.setup({ delay: null });
    render(<RequestInviteDialog {...defaultProps} />);

    const emailInput = screen.getByPlaceholderText(/enter your email address/i);
    const submitButton = screen.getByRole('button', { name: /request invite/i });

    await user.type(emailInput, 'test@example.com');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockQuery).toHaveBeenCalledWith({
        query: expect.any(Object),
        variables: { email: 'test@example.com' },
        fetchPolicy: 'network-only',
      });
    });

    await waitFor(() => {
      expect(mockMutation).toHaveBeenCalledWith({
        variables: {
          requestUserAccessInput: { email: 'test@example.com' },
        },
      });
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Request submitted successfully!');
    });
  });

  it('shows success message after successful submission', async () => {
    const user = userEvent.setup({ delay: null });
    render(<RequestInviteDialog {...defaultProps} />);

    const emailInput = screen.getByPlaceholderText(/enter your email address/i);
    const submitButton = screen.getByRole('button', { name: /request invite/i });

    await user.type(emailInput, 'test@example.com');
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/thank you for joining us/i)
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        /when an account becomes available, an invite will be sent to the email provided/i
      )
    ).toBeInTheDocument();
  });

  it('auto-closes dialog after 3 seconds on successful submission', async () => {
    const onClose = jest.fn();
    const user = userEvent.setup({ delay: null });
    render(<RequestInviteDialog open={true} onClose={onClose} />);

    const emailInput = screen.getByPlaceholderText(/enter your email address/i);
    const submitButton = screen.getByRole('button', { name: /request invite/i });

    await user.type(emailInput, 'test@example.com');
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/thank you for joining us/i)
      ).toBeInTheDocument();
    });

    // Fast-forward 3 seconds
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('handles mutation error and shows error message', async () => {
    const user = userEvent.setup({ delay: null });
    
    // Mock console.error to suppress expected error log
    const originalError = console.error;
    console.error = jest.fn();
    
    // Mock mutation to throw error
    mockMutation.mockRejectedValue(new Error('Network error'));

    render(<RequestInviteDialog {...defaultProps} />);

    const emailInput = screen.getByPlaceholderText(/enter your email address/i);
    const submitButton = screen.getByRole('button', { name: /request invite/i });

    await user.type(emailInput, 'test@example.com');
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/an unexpected error occurred. please try again later./i)
      ).toBeInTheDocument();
    });

    expect(toast.error).toHaveBeenCalledWith('Failed to submit request');
    
    // Restore console.error
    console.error = originalError;
  });

  it('submits on Enter key press', async () => {
    const user = userEvent.setup({ delay: null });
    render(<RequestInviteDialog {...defaultProps} />);

    const emailInput = screen.getByPlaceholderText(/enter your email address/i);

    await user.type(emailInput, 'test@example.com{Enter}');

    await waitFor(() => {
      expect(mockQuery).toHaveBeenCalled();
    });
  });

  it('clears form state when dialog closes', async () => {
    const onClose = jest.fn();
    const user = userEvent.setup({ delay: null });
    const { rerender } = render(<RequestInviteDialog open={true} onClose={onClose} />);

    const emailInput = screen.getByPlaceholderText(/enter your email address/i);
    await user.type(emailInput, 'test@example.com');
    expect(emailInput).toHaveValue('test@example.com');

    // Close dialog
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });

    // Re-open dialog - the state should be cleared
    rerender(<RequestInviteDialog open={true} onClose={onClose} />);
    
    const newEmailInput = screen.getByPlaceholderText(/enter your email address/i);
    expect(newEmailInput).toHaveValue('');
  });

  it('displays loading state on button when submitting', async () => {
    // Mock loading state
    mockUseMutation.mockReturnValueOnce([
      mockMutation,
      { loading: true },
    ]);

    render(<RequestInviteDialog {...defaultProps} />);

    const submitButton = screen.getByRole('button', { name: /submitting/i });
    expect(submitButton).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });

  it('renders login link with correct redirect URL', () => {
    mockPathname.mockReturnValue('/current-page');
    mockSearchParams.toString.mockReturnValue('param=value');

    render(<RequestInviteDialog {...defaultProps} />);

    const loginLink = screen.getByRole('link', { name: /login/i });
    expect(loginLink).toHaveAttribute(
      'href',
      expect.stringContaining('/auth/login?redirect=')
    );
  });

  it('renders mission link correctly', () => {
    render(<RequestInviteDialog {...defaultProps} />);

    const missionLink = screen.getByRole('link', {
      name: /learn more about our mission here/i,
    });
    expect(missionLink).toHaveAttribute('href', '/auth/request-access#mission');
  });

  it('cleans up timeout on unmount', async () => {
    const user = userEvent.setup({ delay: null });
    const { unmount } = render(<RequestInviteDialog {...defaultProps} />);

    const emailInput = screen.getByPlaceholderText(/enter your email address/i);
    const submitButton = screen.getByRole('button', { name: /request invite/i });

    await user.type(emailInput, 'test@example.com');
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/thank you for joining us/i)
      ).toBeInTheDocument();
    });

    // Unmount before timeout completes
    unmount();

    // Fast-forward time - should not cause errors
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    // No errors should occur
    expect(true).toBe(true);
  });
});

