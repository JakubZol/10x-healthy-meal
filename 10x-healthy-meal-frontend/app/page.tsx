"use client";

import { Auth } from "@/components/Auth";
import { Stack, Typography } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { theme } from "@/components/theme";
export default () => (
        <ThemeProvider theme={theme}>
            <main>
                <Stack direction="column" alignItems="center">
                    <Typography variant="h3" mt={2} mb={5} color="primary">10x Healthy Meal</Typography>
                    <Auth />
                </Stack>
            </main>
        </ThemeProvider>
    );
