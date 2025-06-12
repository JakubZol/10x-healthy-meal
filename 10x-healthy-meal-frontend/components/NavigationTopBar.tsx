"use client"

import { AppBar, Toolbar, Button, Typography, Stack, Box } from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import { theme } from "@/components/theme";
import { ThemeProvider } from "@mui/material/styles";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const navigationTabs = [
    { label: "Profil użytkownika", path: "/profile" },
    { label: "Dodaj nowy przepis", path: "/profile/add-recipe" }
]

export const NavigationTopBar = () => {
    const router = useRouter();

    const logout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/");
    };

    return (
        <ThemeProvider theme={theme}>
        <AppBar position="static">
                <Toolbar disableGutters>
                    <Stack direction="row" justifyContent="space-between" width="100%" px={5}>
                        <Stack direction="row">
                            <Stack direction="row" gap={1} alignItems="center" mr={5}>
                                <MenuBookIcon fontSize="large" />
                                <Typography variant="h5">10x Healthy Meal</Typography>
                            </Stack>
                            <Stack direction="row" gap={1} borderLeft="thin solid white" px={5}>
                                {navigationTabs.map(({ label, path }) => (
                                    <Button
                                        key={path}
                                        onClick={() => router.push(path)}
                                        variant="text"
                                        sx={{ color: "white" }}
                                    >
                                        {label}
                                    </Button>
                                ))}
                            </Stack>
                        </Stack>
                        <Button
                            onClick={logout}
                            variant="text"
                            sx={{ color: "white" }}
                        >
                            Wyloguj
                        </Button>
                    </Stack>
                </Toolbar>
        </AppBar>
            </ThemeProvider>
    )
}
