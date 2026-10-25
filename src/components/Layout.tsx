import { faHeadset } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Link, Outlet } from 'react-router-dom';

import { APP_ENV } from '../api/config';

export function Layout() {
  return (
    <>
      <header className="topbar">
        <Link to="/" className="brand">
          <FontAwesomeIcon icon={faHeadset} aria-hidden="true" />
          <span>VoiceDesk Eval Console</span>
        </Link>
        <span className={`env env-${APP_ENV}`} aria-label={`Environment: ${APP_ENV}`}>
          {APP_ENV}
        </span>
      </header>
      <main id="main" className="page">
        <Outlet />
      </main>
    </>
  );
}
