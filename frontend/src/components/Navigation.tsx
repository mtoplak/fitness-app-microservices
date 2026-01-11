import { Button } from "@/components/ui/button";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";

const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handlePonudbaClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    
    if (location.pathname === '/') {
      // Already on homepage, just scroll to section
      const element = document.getElementById('ponudba');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      // Navigate to homepage first, then scroll
      navigate('/');
      setTimeout(() => {
        const element = document.getElementById('ponudba');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <a href="/" className="text-2xl font-bold bg-gradient-to-r from-primary to-[hsl(10,90%,50%)] bg-clip-text text-transparent">
              WiiFit
            </a>
            <div className="hidden md:flex space-x-6">
              <a 
                href="#ponudba" 
                onClick={handlePonudbaClick}
                className="text-foreground/80 hover:text-primary transition-colors cursor-pointer"
              >
                Ponudba
              </a>
              <Link to="/urnik" className="text-foreground/80 hover:text-primary transition-colors">
                Urnik
              </Link>
              <Link to="/protein-calculator" className="text-foreground/80 hover:text-primary transition-colors">
                Beljakovinski kalkulator
              </Link>
              <Link to="/statistics" className="text-foreground/80 hover:text-primary transition-colors">
                Statistika
              </Link>
            </div>
          </div>
          
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <>
                <Link to="/profile"><Button variant="ghost">Profil</Button></Link>
                {user.role === "member" && (
                  <>
                    <Link to="/membership"><Button variant="ghost">Naročnina</Button></Link>
                    <Link to="/personal-training"><Button variant="ghost">Osebni trening</Button></Link>
                  </>
                )}
                {(user.role === "trainer" || user.role === "admin") && (
                  <Link to="/dashboard"><Button variant="ghost">Dashboard</Button></Link>
                )}
                <Button variant="outline" onClick={logout}>Odjava</Button>
              </>
            ) : (
              <>
                <Link to="/login"><Button variant="ghost">Prijava</Button></Link>
                <Link to="/register"><Button>Registracija</Button></Link>
              </>
            )}
          </div>

          <button 
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>

        {isMenuOpen && (
          <div className="md:hidden py-4 space-y-2">
            <a 
              href="#ponudba" 
              onClick={(e) => { handlePonudbaClick(e); setIsMenuOpen(false); }}
              className="block py-2 text-foreground/80 hover:text-primary cursor-pointer"
            >
              Ponudba
            </a>
            <Link to="/urnik" className="block py-2 text-foreground/80 hover:text-primary">
              Urnik
            </Link>
            <Link to="/protein-calculator" className="block py-2 text-foreground/80 hover:text-primary">
              Beljakovinski kalkulator
            </Link>
            <Link to="/statistics" className="block py-2 text-foreground/80 hover:text-primary">
              Statistika
            </Link>
            <div className="flex flex-col space-y-2 pt-2">
              {user ? (
                <>
                  <Link to="/profile"><Button variant="ghost" className="w-full">Profil</Button></Link>
                  {user.role === "member" && (
                    <>
                      <Link to="/membership"><Button variant="ghost" className="w-full">Naročnina</Button></Link>
                      <Link to="/personal-training"><Button variant="ghost" className="w-full">Osebni trening</Button></Link>
                    </>
                  )}
                  {(user.role === "trainer" || user.role === "admin") && (
                    <Link to="/dashboard"><Button variant="ghost" className="w-full">Dashboard</Button></Link>
                  )}
                  <Button variant="outline" className="w-full" onClick={() => { setIsMenuOpen(false); logout(); }}>Odjava</Button>
                </>
              ) : (
                <>
                  <Link to="/login"><Button variant="ghost" className="w-full">Prijava</Button></Link>
                  <Link to="/register"><Button className="w-full">Registracija</Button></Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
