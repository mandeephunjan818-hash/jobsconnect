'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
    Box,
    Container,
    Paper,
    Typography,
    TextField,
    Button,
    Divider,
    CircularProgress,
    ThemeProvider,
    createTheme,
    IconButton,
    Grid
} from '@mui/material';
import { Email, Phone, LocationOn, Send, LinkedIn, Twitter, GitHub } from '@mui/icons-material';

// 1. Define Zod Schema for Validation
const contactSchema = z.object({
    fullName: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email address'),
    phone: z.string().refine(
        (val) => val === '' || /^\+?[1-9]\d{1,14}$/.test(val),
        { message: 'Please enter a valid phone number (e.g., +1234567890)' }
    ),
    subject: z.string().min(3, 'Subject must be at least 3 characters'),
    message: z.string().min(10, 'Message must be at least 10 characters').max(1000, 'Message cannot exceed 1000 characters'),
});

type ContactFormData = z.infer<typeof contactSchema>;

const theme = createTheme({
    palette: {
        primary: {
            main: '#1976d2',
        },
    },
});

export default function ContactSection() {
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<ContactFormData>({
        resolver: zodResolver(contactSchema),
        defaultValues: {
            fullName: '',
            email: '',
            phone: '',
            subject: '',
            message: '',
        },
    });

    const onSubmit = async (data: ContactFormData) => {
        try {
            await new Promise((resolve) => setTimeout(resolve, 1500));
            console.log('Form Data:', data);

            toast.success('Message sent successfully! We will get back to you soon.', {
                position: "top-right",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                theme: "colored",
            });

            reset();
        } catch (error) {
            toast.error('Failed to send message. Please try again later.', {
                theme: "colored",
            });
        }
    };

    return (
        <ThemeProvider theme={theme}>
            <ToastContainer />

            <Box sx={{ py: 10, bgcolor: 'grey.50', minHeight: '100vh' }}>
                <Container maxWidth="lg">
                    <Typography variant="h3" component="h2" align="center" gutterBottom sx={{ fontWeight: 'bold' }}>
                        Get in Touch
                    </Typography>
                    <Typography variant="h6" align="center" color="text.secondary" sx={{ mb: 6, maxWidth: 600, mx: 'auto' }}>
                        Have a question or want to work together? We'd love to hear from you.
                        Fill out the form below and we'll respond as soon as possible.
                    </Typography>

                    <Paper elevation={3} sx={{ p: { xs: 3, md: 5 }, borderRadius: 3 }}>
                        <Grid container spacing={4}>

                            {/* Left Column: Contact Info */}
                            <Grid size={{ xs: 12, md: 4 }}>
                                <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                                    Contact Information
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                    Reach out to us directly or fill out the form.
                                </Typography>

                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                    <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2, alignItems: 'center' }}>
                                        <Email color="primary" />
                                        <Box>
                                            <Typography variant="body2" color="text.secondary">Email</Typography>
                                            <Typography variant="body1">hello@example.com</Typography>
                                        </Box>
                                    </Box>

                                    <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2, alignItems: 'center' }}>
                                        <Phone color="primary" />
                                        <Box>
                                            <Typography variant="body2" color="text.secondary">Phone</Typography>
                                            <Typography variant="body1">+1 (555) 123-4567</Typography>
                                        </Box>
                                    </Box>

                                    <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2, alignItems: 'center' }}>
                                        <LocationOn color="primary" />
                                        <Box>
                                            <Typography variant="body2" color="text.secondary">Office</Typography>
                                            <Typography variant="body1">123 Business Rd, Suite 100<br />San Francisco, CA 94107</Typography>
                                        </Box>
                                    </Box>
                                </Box>

                                <Divider sx={{ my: 4 }} />

                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    Follow Us
                                </Typography>
                                <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1 }}>
                                    <IconButton color="primary" aria-label="LinkedIn"><LinkedIn /></IconButton>
                                    <IconButton color="primary" aria-label="Twitter"><Twitter /></IconButton>
                                    <IconButton color="primary" aria-label="GitHub"><GitHub /></IconButton>
                                </Box>
                            </Grid>

                            {/* Right Column: The Form */}
                            <Grid size={{ xs: 12, md: 8 }}>
                                <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                        <Grid container spacing={2}>
                                            <Grid size={{ xs: 12, sm: 6 }}>
                                                <TextField
                                                    fullWidth
                                                    label="Full Name"
                                                    {...register('fullName')}
                                                    error={!!errors.fullName}
                                                    helperText={errors.fullName?.message}
                                                    disabled={isSubmitting}
                                                    required
                                                />
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6 }}>
                                                <TextField
                                                    fullWidth
                                                    label="Email Address"
                                                    type="email"
                                                    {...register('email')}
                                                    error={!!errors.email}
                                                    helperText={errors.email?.message}
                                                    disabled={isSubmitting}
                                                    required
                                                />
                                            </Grid>
                                        </Grid>

                                        <Grid container spacing={2}>
                                            <Grid size={{ xs: 12, sm: 6 }}>
                                                <TextField
                                                    fullWidth
                                                    label="Phone Number (Optional)"
                                                    {...register('phone')}
                                                    error={!!errors.phone}
                                                    helperText={errors.phone?.message}
                                                    disabled={isSubmitting}
                                                />
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6 }}>
                                                <TextField
                                                    fullWidth
                                                    label="Subject"
                                                    {...register('subject')}
                                                    error={!!errors.subject}
                                                    helperText={errors.subject?.message}
                                                    disabled={isSubmitting}
                                                    required
                                                />
                                            </Grid>
                                        </Grid>

                                        <TextField
                                            fullWidth
                                            label="Your Message"
                                            multiline
                                            rows={5}
                                            {...register('message')}
                                            error={!!errors.message}
                                            helperText={errors.message?.message}
                                            disabled={isSubmitting}
                                            required
                                        />

                                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                                            <Button
                                                type="submit"
                                                variant="contained"
                                                size="large"
                                                disabled={isSubmitting}
                                                startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <Send />}
                                                sx={{
                                                    py: 1.5,
                                                    px: 4,
                                                    borderRadius: 2,
                                                    textTransform: 'none',
                                                    fontSize: '1rem',
                                                    fontWeight: 600
                                                }}
                                            >
                                                {isSubmitting ? 'Sending...' : 'Send Message'}
                                            </Button>
                                        </Box>
                                    </Box>
                                </Box>
                            </Grid>

                        </Grid>
                    </Paper>
                </Container>
            </Box>
        </ThemeProvider>
    );
}