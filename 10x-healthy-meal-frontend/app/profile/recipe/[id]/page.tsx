"use client"

import { useParams } from 'next/navigation'
import { useEffect, useState } from "react";
import { theme } from "@/components/theme";
import { ThemeProvider } from "@mui/material/styles";
import { Card, CardContent, Stack, CardHeader, Typography, Paper, Button } from "@mui/material";
import { useRouter } from "next/navigation";
import { Recipe } from "@/lib/types";

export default function ProtectedPage() {
    const params = useParams();
    const router = useRouter();
    const [recipe, setRecipe] = useState<Recipe | null>(null);

    const { id } = params

    useEffect(() => {
        fetch(`/api/recipes/${id}`).then(res => res.json()).then(res => setRecipe(res));
    }, [])

    const goBack = () => router.push("/profile");

    const deleteRecipe = () => {
        fetch(`/api/recipes/${recipe?.id}`, { method: 'DELETE' }).then(() =>
            router.push("/profile")
        );
    }

 return (
     <ThemeProvider theme={theme}>
         <Stack direction="column" alignItems="center" py={5}>
             <Card sx={{ width: 700 }}>
                 <CardHeader title={recipe?.title} />
                 <CardContent>
                     <Stack direction="column" gap={1}>
                         <Stack direction="column">
                             <Typography>Recipe:</Typography>
                             <Paper variant="outlined" sx={{ p: 2 }}>{recipe?.modified_text}</Paper>
                         </Stack>
                         <Stack direction="column">
                             <Typography>Original recipe:</Typography>
                             <Paper variant="outlined" sx={{ p: 2 }}>{recipe?.original_text}</Paper>
                         </Stack>
                         <Stack direction="column">
                             <Typography>Modification prompt:</Typography>
                             <Paper variant="outlined" sx={{ p: 2 }}>{recipe?.modification_prompt}</Paper>
                         </Stack>
                         <Stack direction="row" gap={1}>
                             <Typography>Added at:</Typography>
                             <Typography>{recipe?.created_at}</Typography>
                         </Stack>
                         <Stack direction="row" gap={5} justifyContent="center" mt={3}>
                             <Button variant="contained" onClick={goBack}>Wróć do profilu</Button>
                             <Button variant="contained" onClick={deleteRecipe}>Usuń</Button>
                         </Stack>
                     </Stack>
                 </CardContent>
             </Card>
         </Stack>
     </ThemeProvider>
 )
}
