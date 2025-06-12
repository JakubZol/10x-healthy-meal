"use client"

import { Card, Stack, Typography, IconButton } from "@mui/material"
import DeleteIcon from '@mui/icons-material/Delete';
import { useEffect, useState } from "react";
import { theme } from "@/components/theme";
import { ThemeProvider } from "@mui/material/styles";
import { useRouter } from "next/navigation";

export const UserRecipes = () => {
    const router = useRouter();
    const [recipes, setRecipes] = useState([]);

    useEffect(() => {
        fetch("/api/recipes").then(res => res.json()).then(res => setRecipes(res.data));
    }, [])

    const deleteRecipe = (recipeId: string) => {
        fetch(`api/recipes/${recipeId}`, { method: 'DELETE' }).then(() =>
            setRecipes((prevRecipes) => prevRecipes.filter(({ id }) => id !== recipeId))
        );
    }

    return (
        <ThemeProvider theme={theme} >
            <Stack direction="column" width="100%" alignItems="flex-start" px={5}>
                <Typography variant="h4">Recipes</Typography>
                <Stack direction="column" gap="5" width="100%" py={2}>
                    {recipes.map(({ title, id, created_at }) => (
                        <Card
                            sx={{ width: "100%", height: 50, px: 2, cursor: "pointer" }}
                            key={id}
                            onClick={() => router.push(`/profile/recipe/${id}`)}
                        >
                            <Stack direction="row" justifyContent="space-between" alignItems="center" height="100%">
                                <Stack direction="row" gap={2}>
                                    <Typography>{title}</Typography>
                                    <Typography> {created_at}</Typography>
                                </Stack>
                                <IconButton onClick={(e) => {
                                    e.stopPropagation();

                                    deleteRecipe(id)
                                }}>
                                    <DeleteIcon color="primary" />
                                </IconButton>
                            </Stack>
                        </Card>
                    ))}
                </Stack>
            </Stack>
        </ThemeProvider>
    )
}
