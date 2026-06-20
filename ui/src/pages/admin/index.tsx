import { useMemo, useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ExitIcon, StarFilledIcon } from '@radix-ui/react-icons';
import { MenuItem, Sidebar } from './components/sidebar';
import "./index.css"
import {
  HomeIcon,
  GearIcon,
  BackpackIcon,
  TableIcon,
  MagnifyingGlassIcon,
} from '@radix-ui/react-icons';
import { useOnce } from '../../utils/useOnce';
import { useGlobalTheme } from '../../utils/useGlobalTheme';
import { useTranslation } from '../../i18n';
import DarkSwitch from '../../components/DarkSwitch';

const getMenuItems = (t: (key: string) => string): MenuItem[] => [
  { key: 'tools', icon: <BackpackIcon className="w-5 h-5" />, label: t('admin.tools.title'), path: '/admin/tools' },
  { key: 'categories', icon: <TableIcon className="w-5 h-5" />, label: t('admin.catelog.title'), path: '/admin/categories' },
  { key: 'search-engines', icon: <MagnifyingGlassIcon className="w-5 h-5" />, label: t('admin.search.title'), path: '/admin/search-engines' },
  { key: 'api-token', icon: <StarFilledIcon className="w-5 h-5" />, label: t('admin.token.title'), path: '/admin/api-token' },
  { key: 'settings', icon: <GearIcon className="w-5 h-5" />, label: t('admin.settings.title'), path: '/admin/settings' },
];

export const AdminPage = () => {
  useGlobalTheme();
  const { t } = useTranslation();
  const menuItems = useMemo(() => getMenuItems(t), [t]);

  const location = useLocation();
  const navigate = useNavigate();
  const [currentKey, setCurrentKey] = useState('tools');

  useOnce(() => {
    if (!localStorage.getItem('_token')) {
      navigate('/login');
    }
  }, []);

  // 根据当前路径设置选中的菜单项
  useEffect(() => {
    const pathname = location.pathname;
    const currentItem = menuItems.find(item => pathname.includes(item.key));
    if (currentItem) {
      setCurrentKey(currentItem.key);
    }
  }, [location, menuItems]);

  // 处理{t('admin.header.logout')}
  const handleLogout = () => {
    localStorage.removeItem('_token');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#F7F7FA] dark:bg-[#030A14]">
      {/* Header */}
      <header className="bg-white dark:bg-[#0B1D34] border-b border-gray-200 dark:border-[#10243D]">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">{t('admin.header.title')}</h1>
            </div>

            <div className="flex items-center space-x-4">
              <Link
                to="/"
                className="flex items-center px-3 py-2 text-sm text-gray-700 hover:text-gray-900"
              >
                <HomeIcon className="w-4 h-4 mr-2" />
                {t('admin.header.home')}
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center px-3 py-2 text-sm text-gray-700 hover:text-gray-900"
              >
                <ExitIcon className="w-4 h-4 mr-2" />
                {t('admin.header.logout')}
              </button>
              <DarkSwitch showGithub={false} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      {/* Main Content */}
      <div className="flex flex-1 w-full mx-auto h-[calc(100vh-64px)]">
        {/* Sidebar */}
        <Sidebar items={menuItems} currentKey={currentKey} onChange={setCurrentKey} />
        {/* Main Content Area */}
        <main className="flex-1 overflow-auto bg-[#F7F7FA] dark:bg-[#030A14]">
          <div className="p-4 h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminPage;
