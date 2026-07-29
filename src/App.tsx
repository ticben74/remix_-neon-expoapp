import { useEffect, useState, Suspense, lazy } from 'react';
import { LandingPage } from './components/LandingPage';
import { CampaignConfig } from './types';
import { auth } from './lib/localAuth';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const SetupView = lazy(() => import('./components/SetupView').then(m => ({ default: m.SetupView })));
const CustomerView = lazy(() => import('./components/CustomerView').then(m => ({ default: m.CustomerView })));

export default function App() {
  const [config, setConfig] = useState<CampaignConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'user' | null>(null);
  const [view, setView] = useState<'landing' | 'setup' | 'customer'>('landing');

  useEffect(() => {
    try {
      // Listen to our PostgreSQL-backed custom authentication store
      const unsubscribe = auth.onAuthStateChanged((user) => {
        if (user) {
          setUserRole(user.role);
          if (!new URLSearchParams(window.location.search).get('id')) {
            setView('setup');
          }
        } else {
          setUserRole(null);
        }
        setIsAuthReady(true);
      });
      return () => unsubscribe();
    } catch (error) {
      console.error('Auth initialization failed:', error);
      setIsAuthReady(true);
      return undefined;
    }
  }, []);

  useEffect(() => {
    if (!isAuthReady) return;

    const params = new URLSearchParams(window.location.search);
    const campaignId = params.get('id');

    if (campaignId) {
      setView('customer');
      
      let isSubscribed = true;

      const fetchFromPostgres = async () => {
        try {
          const response = await fetch(`/api/campaigns/${campaignId}`);
          if (!response.ok) {
            throw new Error(`PostgreSQL fetch failed with status ${response.status}`);
          }
          const data = await response.json();
          if (isSubscribed) {
            setConfig(data);
            setLoading(false);
          }
        } catch (error) {
          console.error('Error fetching campaign from PostgreSQL:', error);
          setLoading(false);
        }
      };

      fetchFromPostgres();

      // Subscribe to Server-Sent Events for instant, real-time Postgres updates
      const eventSource = new EventSource(`/api/campaigns/${campaignId}/events`);
      
      eventSource.onmessage = (event) => {
        try {
          const updatedCampaign = JSON.parse(event.data);
          if (isSubscribed) {
            setConfig(updatedCampaign);
          }
        } catch (err) {
          console.error('Error parsing SSE campaign update:', err);
        }
      };

      eventSource.onerror = (err) => {
        console.error('SSE connection error:', err);
      };

      return () => {
        isSubscribed = false;
        eventSource.close();
      };
    } else {
      setLoading(false);
    }
  }, [isAuthReady]);

  if (loading || !isAuthReady) {
    return (
      <div className="min-h-screen bg-[#FDFCFB] text-neutral-900 flex items-center justify-center px-6">
        <div className="w-full max-w-xl rounded-[2rem] border border-neutral-200 bg-white/90 p-8 text-center shadow-sm backdrop-blur">
          <Loader2 className="mx-auto mb-4 h-10 w-10 text-indigo-600 animate-spin" />
          <h2 className="text-xl font-black tracking-tight">Chargement de l’application…</h2>
          <p className="mt-2 text-sm text-neutral-500">La plateforme se prépare et affichera bientôt l’interface demandée.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCFB] antialiased selection:bg-sky-100 selection:text-sky-900 overflow-x-hidden">
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-neutral-50">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        </div>
      }>
        <AnimatePresence mode="wait">
          {view === 'customer' && config ? (
            <motion.div
              key="customer"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
            >
              <CustomerView config={config} />
            </motion.div>
          ) : view === 'setup' ? (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
            >
              <SetupView userRole={userRole} />
            </motion.div>
          ) : (
            <motion.div
              key="landing"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
            >
              <LandingPage onStart={() => setView('setup')} />
            </motion.div>
          )}
        </AnimatePresence>
      </Suspense>
    </div>
  );
}
