import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, CreditCard, Check, AlertCircle, RefreshCw } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

type MembershipPackage = {
  _id: string;
  name: string;
  price: number;
};

type CurrentMembership = {
  id: string;
  package: {
    id: string;
    name: string;
    price: number;
  };
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  status: "active" | "cancelled" | "expired";
  nextPackage?: {
    id: string;
    name: string;
    price: number;
  };
  cancelledAt?: string;
} | null;

type MembershipHistory = {
  id: string;
  package: {
    id: string;
    name: string;
    price: number;
  };
  startDate: string;
  endDate: string;
  status: string;
  autoRenew: boolean;
  cancelledAt?: string;
  createdAt: string;
};

type Payment = {
  id: string;
  amount: number;
  status: string;
  paymentMethod?: string;
  paymentDate?: string;
  description: string;
  createdAt: string;
};

export default function Membership() {
  const [packages, setPackages] = useState<MembershipPackage[]>([]);
  const [currentMembership, setCurrentMembership] = useState<CurrentMembership>(null);
  const [history, setHistory] = useState<MembershipHistory[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState<MembershipPackage | null>(null);
  const [actionType, setActionType] = useState<"subscribe" | "change" | "cancel" | "reactivate" | null>(null);
  const [showPackages, setShowPackages] = useState(false);
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [packagesData, membershipData, historyData, paymentsData] = await Promise.all([
        api.getMembershipPackages(),
        api.getCurrentMembership(),
        api.getMembershipHistory(),
        api.getPayments()
      ]);
      
      setPackages(packagesData.packages);
      setCurrentMembership(membershipData.membership);
      setHistory(historyData.memberships);
      setPayments(paymentsData.payments);
    } catch (error) {
      console.error("Napaka pri nalaganju podatkov:", error);
      toast({
        title: "Napaka",
        description: "Napaka pri nalaganju podatkov o naročnini",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Preveri, če je bil shranjen selectedPackage iz homepage
  useEffect(() => {
    const savedPackageId = localStorage.getItem("selectedPackage");
    if (savedPackageId && packages.length > 0 && !currentMembership) {
      const pkg = packages.find(p => p._id === savedPackageId);
      if (pkg) {
        setSelectedPackage(pkg);
        setActionType("subscribe");
        // Počisti localStorage
        localStorage.removeItem("selectedPackage");
      }
    }
  }, [packages, currentMembership]);

  const handleSubscribe = async () => {
    if (!selectedPackage) return;

    try {
      const result = await api.subscribeToPlan(selectedPackage._id);
      toast({
        title: "Uspešno",
        description: result.message
      });
      setActionType(null);
      setSelectedPackage(null);
      setShowPackages(false);
      await loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Napaka pri naročanju";
      toast({
        title: "Napaka",
        description: message,
        variant: "destructive"
      });
    }
  };

  const handleChangePackage = async () => {
    if (!selectedPackage) return;

    try {
      const result = await api.changeMembershipPackage(selectedPackage._id);
      toast({
        title: "Uspešno",
        description: result.message
      });
      setActionType(null);
      setSelectedPackage(null);
      setShowPackages(false);
      await loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Napaka pri spreminjanju paketa";
      toast({
        title: "Napaka",
        description: message,
        variant: "destructive"
      });
    }
  };

  const handleCancel = async () => {
    try {
      const result = await api.cancelMembership();
      toast({
        title: "Naročnina preklicana",
        description: result.message
      });
      setActionType(null);
      await loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Napaka pri preklicu";
      toast({
        title: "Napaka",
        description: message,
        variant: "destructive"
      });
    }
  };

  const handleReactivate = async () => {
    try {
      const result = await api.reactivateMembership();
      toast({
        title: "Uspešno",
        description: result.message
      });
      setActionType(null);
      await loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Napaka pri reaktivaciji";
      toast({
        title: "Napaka",
        description: message,
        variant: "destructive"
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("sl-SI", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default">Aktivna</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Preklicana</Badge>;
      case "expired":
        return <Badge variant="secondary">Potekla</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="default">Plačano</Badge>;
      case "pending":
        return <Badge variant="secondary">V teku</Badge>;
      case "failed":
        return <Badge variant="destructive">Neuspešno</Badge>;
      case "refunded":
        return <Badge variant="outline">Vrnjeno</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <p className="text-muted-foreground">Nalagam...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Upravljanje naročnine</h1>
        <p className="text-muted-foreground">
          Pregled in upravljanje vaše naročnine na fitnes center
        </p>
      </div>

      {/* Trenutna naročnina */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Trenutna naročnina
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentMembership ? (
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div className="space-y-4 flex-1">
                  <div>
                    <h3 className="text-2xl font-bold">{currentMembership.package.name}</h3>
                    <p className="text-3xl font-bold text-primary mt-2">
                      {currentMembership.package.price}€<span className="text-base font-normal text-muted-foreground">/mesec</span>
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      {getStatusBadge(currentMembership.status)}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Samodejno podaljševanje</p>
                      <div className="flex items-center gap-2 mt-1">
                        {currentMembership.autoRenew ? (
                          <>
                            <Check className="h-4 w-4 text-green-600" />
                            <span className="font-medium">Omogočeno</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-4 w-4 text-orange-600" />
                            <span className="font-medium">Onemogočeno</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Začetek</p>
                      <p className="font-medium">{formatDate(currentMembership.startDate)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {currentMembership.status === "cancelled" ? "Poteče" : "Veljavna do"}
                      </p>
                      <p className="font-medium">{formatDate(currentMembership.endDate)}</p>
                    </div>
                  </div>

                  {currentMembership.nextPackage && (
                    <Alert>
                      <RefreshCw className="h-4 w-4" />
                      <AlertTitle>Načrtovana sprememba</AlertTitle>
                      <AlertDescription>
                        Po {formatDate(currentMembership.endDate)} bo aktiviran paket <strong>{currentMembership.nextPackage.name}</strong> ({currentMembership.nextPackage.price}€/mesec)
                      </AlertDescription>
                    </Alert>
                  )}

                  {currentMembership.status === "cancelled" && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Naročnina preklicana</AlertTitle>
                      <AlertDescription>
                        Vaša naročnina bo potekla {formatDate(currentMembership.endDate)}. Do takrat imate še vedno dostop do vseh storitev.
                        {currentMembership.cancelledAt && (
                          <span className="block mt-1 text-xs">
                            Preklicano: {formatDate(currentMembership.cancelledAt)}
                          </span>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">Nimate aktivne naročnine</p>
              <Button onClick={() => setShowPackages(true)}>
                Izberi paket
              </Button>
            </div>
          )}
        </CardContent>
        
        {currentMembership && (
          <CardFooter className="flex gap-2 border-t pt-6">
            <Button 
              variant="outline"
              onClick={() => setShowPackages(true)}
            >
              Spremeni paket
            </Button>
            
            {currentMembership.status === "active" && (
              <Button
                variant="destructive"
                onClick={() => setActionType("cancel")}
              >
                Prekliči naročnino
              </Button>
            )}
            
            {currentMembership.status === "cancelled" && (
              <Button
                onClick={() => setActionType("reactivate")}
              >
                Reaktiviraj naročnino
              </Button>
            )}
          </CardFooter>
        )}
      </Card>

      {/* Tabs za zgodovino in plačila */}
      <Tabs defaultValue="history">
        <TabsList>
          <TabsTrigger value="history">Zgodovina naročnin</TabsTrigger>
          <TabsTrigger value="payments">Plačila</TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Zgodovina naročnin</CardTitle>
              <CardDescription>Pregled vseh preteklih in trenutnih naročnin</CardDescription>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Ni zgodovine naročnin</p>
              ) : (
                <div className="space-y-4">
                  {history.map((membership) => (
                    <Card key={membership.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{membership.package.name}</h4>
                              {getStatusBadge(membership.status)}
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span>
                                  {formatDate(membership.startDate)} - {formatDate(membership.endDate)}
                                </span>
                              </div>
                              {membership.cancelledAt && (
                                <p className="text-xs">
                                  Preklicano: {formatDate(membership.cancelledAt)}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{membership.package.price}€</p>
                            <p className="text-xs text-muted-foreground">na mesec</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Zgodovina plačil</CardTitle>
              <CardDescription>Pregled vseh plačil in transakcij</CardDescription>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Ni plačil</p>
              ) : (
                <div className="space-y-4">
                  {payments.map((payment) => (
                    <Card key={payment.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{payment.description}</h4>
                              {getPaymentStatusBadge(payment.status)}
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span>
                                  {payment.paymentDate 
                                    ? formatDate(payment.paymentDate)
                                    : formatDate(payment.createdAt)
                                  }
                                </span>
                              </div>
                              {payment.paymentMethod && (
                                <p className="text-xs">{payment.paymentMethod}</p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold">{payment.amount}€</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog za izbiro paketa */}
      <Dialog open={showPackages} onOpenChange={setShowPackages}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {currentMembership ? "Spremeni paket" : "Izberi paket"}
            </DialogTitle>
            <DialogDescription>
              {currentMembership 
                ? "Nov paket bo začel veljati po koncu trenutne naročnine"
                : "Izberite paket, ki vam najbolj ustreza"
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {packages.map((pkg) => {
              const isCurrent = currentMembership?.package.id === pkg._id;
              const isNext = currentMembership?.nextPackage?.id === pkg._id;
              
              return (
                <Card key={pkg._id} className={isCurrent ? "border-primary" : ""}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {pkg.name}
                      {isCurrent && <Badge>Trenutni</Badge>}
                      {isNext && <Badge variant="secondary">Načrtovan</Badge>}
                    </CardTitle>
                    <CardDescription>
                      <span className="text-3xl font-bold text-primary">
                        {pkg.price}€
                      </span>
                      <span className="text-muted-foreground">/mesec</span>
                    </CardDescription>
                  </CardHeader>
                  <CardFooter>
                    <Button
                      className="w-full"
                      onClick={() => {
                        setSelectedPackage(pkg);
                        setActionType(currentMembership ? "change" : "subscribe");
                      }}
                      disabled={isCurrent}
                      variant={isCurrent ? "outline" : "default"}
                    >
                      {isCurrent ? "Trenutni paket" : currentMembership ? "Spremeni na ta paket" : "Izberi"}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation dialogs */}
      <AlertDialog open={actionType === "subscribe"} onOpenChange={() => setActionType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Potrditev naročnine</AlertDialogTitle>
            <AlertDialogDescription>
              Ali se želite naročiti na paket <strong>{selectedPackage?.name}</strong> za <strong>{selectedPackage?.price}€/mesec</strong>?
              <br /><br />
              Naročnina bo aktivna takoj po plačilu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedPackage(null)}>Prekliči</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubscribe}>Potrdi naročnino</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={actionType === "change"} onOpenChange={() => setActionType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Potrditev spremembe paketa</AlertDialogTitle>
            <AlertDialogDescription>
              Ali želite spremeniti paket na <strong>{selectedPackage?.name}</strong> ({selectedPackage?.price}€/mesec)?
              <br /><br />
              <strong>Pomembno:</strong> Nov paket bo začel veljati po koncu trenutne naročnine ({currentMembership && formatDate(currentMembership.endDate)}).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedPackage(null)}>Prekliči</AlertDialogCancel>
            <AlertDialogAction onClick={handleChangePackage}>Potrdi spremembo</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={actionType === "cancel"} onOpenChange={() => setActionType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Preklic naročnine</AlertDialogTitle>
            <AlertDialogDescription>
              Ali res želite preklicati naročnino?
              <br /><br />
              <strong>Pomembno:</strong> Naročnina bo še vedno aktivna do {currentMembership && formatDate(currentMembership.endDate)}. Po tem datumu ne bo več samodejno podaljšana.
              <br /><br />
              Naročnino lahko kadarkoli ponovno aktivirate.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Ne, ohrani naročnino</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Da, prekliči naročnino
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={actionType === "reactivate"} onOpenChange={() => setActionType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reaktivacija naročnine</AlertDialogTitle>
            <AlertDialogDescription>
              Ali želite ponovno aktivirati naročnino?
              <br /><br />
              Samodejno podaljševanje bo ponovno omogočeno in naročnina se bo podaljšala po {currentMembership && formatDate(currentMembership.endDate)}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Prekliči</AlertDialogCancel>
            <AlertDialogAction onClick={handleReactivate}>Reaktiviraj naročnino</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
