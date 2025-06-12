import { NavigationTopBar } from "@/components/NavigationTopBar";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
    return (
        <main>
            <NavigationTopBar />
            {children}
        </main>
    );
};
