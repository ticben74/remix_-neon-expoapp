import bcrypt from 'bcryptjs';

export interface OfflineUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: 'admin' | 'user';
  passwordHash: string;
}

export function createOfflineAuthStore() {
  const users = new Map<string, OfflineUser>();

  const ensureDemoAdmin = () => {
    const email = 'crealab.imed@gmail.com';
    if (!users.has(email)) {
      users.set(email, {
        uid: 'demo-admin',
        email,
        displayName: 'Créalab Admin',
        photoURL: '',
        role: 'admin',
        passwordHash: bcrypt.hashSync('crealab_demo_123', 10),
      });
    }
  };

  ensureDemoAdmin();

  return {
    users,
    ensureDemoAdmin,
    hasEmail(email: string) {
      return users.has(email.toLowerCase().trim());
    },
    getUser(email: string) {
      return users.get(email.toLowerCase().trim()) || null;
    },
    getUserByUid(uid: string) {
      for (const user of users.values()) {
        if (user.uid === uid) {
          return user;
        }
      }
      return null;
    },
    register(email: string, password: string, name?: string, photoURL = '', role: 'admin' | 'user' = 'user') {
      const normalizedEmail = email.toLowerCase().trim();
      if (users.has(normalizedEmail)) {
        return null;
      }

      const user: OfflineUser = {
        uid: `offline_${Math.random().toString(36).slice(2, 10)}`,
        email: normalizedEmail,
        displayName: name || normalizedEmail.split('@')[0],
        photoURL,
        role,
        passwordHash: bcrypt.hashSync(password, 10),
      };

      users.set(normalizedEmail, user);
      return user;
    },
    authenticate(email: string, password: string) {
      const normalizedEmail = email.toLowerCase().trim();
      const user = users.get(normalizedEmail);
      if (!user) {
        return null;
      }

      if (!bcrypt.compareSync(password, user.passwordHash)) {
        return null;
      }

      return user;
    },
  };
}
