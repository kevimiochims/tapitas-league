import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import MobileDrawer from "./components/MobileDrawer";
import { DrawerProvider } from "./context/DrawerContext";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata = {
  title: "Tapitas League",
  description: "Fantasy Football League",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-[#171717] text-white">
        <DrawerProvider>
          <MobileDrawer />
          {children}
        </DrawerProvider>
      </body>
    </html>
  )
}