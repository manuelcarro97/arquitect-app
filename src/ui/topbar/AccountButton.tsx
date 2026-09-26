import { signIn, signOut, useAuthStore } from '../../cloud/authStore';
import { Popover } from '../components/Popover';

/** "Entrar con Google" when signed out; the user's picture with a "Salir" menu when signed in. */
export function AccountButton({ onMessage }: { onMessage: (text: string) => void }) {
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);

  if (status === 'loading') return null;
  if (!user) {
    return (
      <button
        onClick={() => signIn().catch((error: Error) => onMessage(error.message))}
        title="Entra para guardar y abrir tus proyectos en la nube"
      >
        Entrar con Google
      </button>
    );
  }

  const avatar = user.photoUrl ? (
    <img className="account__avatar" src={user.photoUrl} alt="" referrerPolicy="no-referrer" />
  ) : (
    <span className="account__avatar account__avatar--initial">{user.name.charAt(0).toUpperCase()}</span>
  );

  return (
    <Popover label={avatar} title={user.email} buttonClassName="account__button" align="right">
      {(close) => (
        <div className="menu">
          <p className="menu__text">
            <strong>{user.name}</strong>
            <br />
            {user.email}
          </p>
          <button
            className="menu__item"
            onClick={() => {
              close();
              void signOut();
            }}
          >
            Salir
          </button>
        </div>
      )}
    </Popover>
  );
}
