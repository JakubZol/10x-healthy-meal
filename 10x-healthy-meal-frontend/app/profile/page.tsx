import { Stack } from "@mui/material"
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { UserProfile } from "@/components/UserProfile";
import {UserRecipes} from "@/components/UserRecipes";

export default async function ProtectedPage() {
    const supabase = await createClient();

    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
        redirect("/");
    }

    return (
        <Stack direction="column" alignItems="center" my={5} gap={5}>
            <UserProfile email={data?.user?.email}/>
            <UserRecipes />
        </Stack>
    )
};
