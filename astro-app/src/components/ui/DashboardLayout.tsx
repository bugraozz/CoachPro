import React, { useState } from 'react';
import {
  Layout,
  Menu,
  Avatar,
  Dropdown,
  Button,
  Typography,
  Space,
  Badge,
  Divider,
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Empty,
} from 'antd';
import {
  DashboardOutlined,
  TeamOutlined,
  FileTextOutlined,
  LineChartOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BellOutlined,
  SettingOutlined,
  CoffeeOutlined,
  ThunderboltOutlined,
  ExperimentOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import AntdProvider from './AntdProvider';

const { Header, Sider, Content } = Layout;
const { Text, Title } = Typography;

interface Student {
  id: string;
  name: string;
  email: string;
  currentWeight?: number;
  targetWeight?: number;
  active: boolean;
  programs: any[];
  dietPlans: any[];
  createdAt: string;
}

interface DashboardLayoutProps {
  children?: React.ReactNode;
  activePage?: string;
  user?: {
    name: string;
    email: string;
    role: string;
    referralCode?: string;
    currentWeight?: number;
    targetWeight?: number;
    height?: number;
  } | null;
  isCoach?: boolean;
  students?: Student[];
  stats?: {
    totalStudents: number;
    activePrograms: number;
    activeDiets: number;
  };
  coach?: { name: string; email: string } | null;
  activeProgram?: any;
  activeDiet?: any;
}

type MenuItem = Required<MenuProps>['items'][number];

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ 
  children, 
  activePage = 'dashboard',
  user,
  isCoach: isCoachProp,
  students = [],
  stats = { totalStudents: 0, activePrograms: 0, activeDiets: 0 },
  coach,
  activeProgram,
  activeDiet,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  const isCoach = isCoachProp ?? user?.role === 'coach';

  const menuItems: MenuItem[] = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: <a href="/dashboard">Dashboard</a>,
    },
    ...(isCoach ? [{
      key: 'students',
      icon: <TeamOutlined />,
      label: <a href="/students">Öğrencilerim</a>,
    }] : []),
    {
      key: 'programs',
      icon: <ThunderboltOutlined />,
      label: <a href="/programs">Programlar</a>,
    },
    {
      key: 'diet',
      icon: <CoffeeOutlined />,
      label: <a href="/diet">Diyet Planları</a>,
    },
    {
      key: 'analysis',
      icon: <ExperimentOutlined />,
      label: <a href="/analysis">Vücut Analizi</a>,
    },
    {
      key: 'progress',
      icon: <LineChartOutlined />,
      label: <a href="/progress">Gelişim Takibi</a>,
    },
  ];

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profil',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Ayarlar',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: <a href="/auth/logout">Çıkış Yap</a>,
      danger: true,
    },
  ];

  return (
    <AntdProvider>
      <Layout style={{ minHeight: '100vh' }}>
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          width={260}
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
            zIndex: 100,
            borderRight: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {/* Logo */}
          <div style={{ 
            padding: collapsed ? '20px 12px' : '20px 24px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #CD0000 0%, #A00000 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              fontWeight: 700,
              color: '#fff',
              flexShrink: 0,
            }}>
              CP
            </div>
            {!collapsed && (
              <div>
                <Title level={5} style={{ margin: 0, color: '#fff' }}>CoachPro</Title>
                <Text type="secondary" style={{ fontSize: 11 }}>Fitness Platform</Text>
              </div>
            )}
          </div>

          {/* Menu */}
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[activePage]}
            items={menuItems}
            style={{ 
              borderRight: 0,
              marginTop: 12,
              padding: '0 8px',
            }}
          />

          {/* User Profile at Bottom */}
          {user && (
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: collapsed ? '16px 8px' : '16px',
              borderTop: '1px solid rgba(255,255,255,0.06)',
            }}>
              <Dropdown menu={{ items: userMenuItems }} placement="topRight" trigger={['click']}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: collapsed ? '8px' : '10px 12px',
                  borderRadius: 10,
                  cursor: 'pointer',
                  background: 'rgba(255,255,255,0.03)',
                  transition: 'all 0.2s',
                }}>
                  <Avatar 
                    size={collapsed ? 36 : 40}
                    style={{ 
                      background: 'linear-gradient(135deg, #CD0000 0%, #A00000 100%)',
                      flexShrink: 0,
                    }}
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </Avatar>
                  {!collapsed && (
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Text strong style={{ display: 'block', color: '#fff' }} ellipsis>
                        {user.name}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {isCoach ? 'Eğitmen' : 'Öğrenci'}
                      </Text>
                    </div>
                  )}
                </div>
              </Dropdown>
            </div>
          )}
        </Sider>

        <Layout style={{ marginLeft: collapsed ? 80 : 260, transition: 'all 0.2s' }}>
          {/* Header */}
          <Header style={{
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 99,
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: 16, width: 40, height: 40 }}
            />

            <Space size={16}>
              <Badge count={3} size="small">
                <Button type="text" icon={<BellOutlined />} style={{ fontSize: 18 }} />
              </Badge>
              {!user && (
                <Space>
                  <Button href="/auth/login">Giriş Yap</Button>
                  <Button type="primary" href="/auth/register">Kayıt Ol</Button>
                </Space>
              )}
            </Space>
          </Header>

          {/* Content */}
          <Content style={{ 
            padding: 24,
            minHeight: 'calc(100vh - 64px)',
          }}>
            {activePage === 'dashboard' ? (
              isCoach ? (
                <CoachDashboardContent 
                  user={{ name: user?.name || '', referralCode: user?.referralCode || '' }}
                  students={students}
                  stats={stats}
                />
              ) : (
                <StudentDashboardContent
                  user={{
                    name: user?.name || '',
                    email: user?.email || '',
                    currentWeight: user?.currentWeight,
                    targetWeight: user?.targetWeight,
                    height: user?.height,
                  }}
                  coach={coach}
                  activeProgram={activeProgram}
                  activeDiet={activeDiet}
                />
              )
            ) : children}
          </Content>
        </Layout>
      </Layout>
    </AntdProvider>
  );
};

// Coach Dashboard Content Component
const CoachDashboardContent: React.FC<{
  user: { name: string; referralCode: string };
  students: Student[];
  stats: { totalStudents: number; activePrograms: number; activeDiets: number };
}> = ({ user, students, stats }) => {
  const columns = [
    {
      title: 'Öğrenci',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Student) => (
        <Space>
          <Avatar style={{ background: 'linear-gradient(135deg, #CD0000 0%, #A00000 100%)' }}>
            {name.charAt(0).toUpperCase()}
          </Avatar>
          <div>
            <Text strong style={{ display: 'block' }}>{name}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{record.email}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Kilo',
      dataIndex: 'currentWeight',
      key: 'currentWeight',
      render: (weight: number) => weight ? `${weight} kg` : '—',
    },
    {
      title: 'Durum',
      dataIndex: 'active',
      key: 'active',
      render: (active: boolean) => (
        <Tag color={active ? 'green' : 'red'}>{active ? 'Aktif' : 'Pasif'}</Tag>
      ),
    },
    {
      title: 'İşlem',
      key: 'action',
      render: (_: any, record: Student) => (
        <Button type="link" href={`/students/${record.id}`}>Detay</Button>
      ),
    },
  ];

  return (
    <div>
      <Title level={2} style={{ marginBottom: 8 }}>Hoş geldin, {user.name} 👋</Title>
      <Text type="secondary" style={{ marginBottom: 24, display: 'block' }}>
        Öğrencilerini yönet ve gelişimlerini takip et.
      </Text>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ background: 'linear-gradient(135deg, #CD0000 0%, #A00000 100%)', borderRadius: 16 }} bordered={false}>
            <Statistic
              title={<Text style={{ color: 'rgba(255,255,255,0.8)' }}>Toplam Öğrenci</Text>}
              value={stats.totalStudents}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#fff', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', borderRadius: 16 }} bordered={false}>
            <Statistic
              title={<Text style={{ color: 'rgba(255,255,255,0.8)' }}>Aktif Program</Text>}
              value={stats.activePrograms}
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: '#fff', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', borderRadius: 16 }} bordered={false}>
            <Statistic
              title={<Text style={{ color: 'rgba(255,255,255,0.8)' }}>Aktif Diyet</Text>}
              value={stats.activeDiets}
              prefix={<CoffeeOutlined />}
              valueStyle={{ color: '#fff', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', borderRadius: 16 }} bordered={false}>
            <Statistic
              title={<Text style={{ color: 'rgba(255,255,255,0.8)' }}>Referans Kodu</Text>}
              value={user.referralCode}
              valueStyle={{ color: '#fff', fontWeight: 700, fontSize: 18 }}
            />
            <Button size="small" ghost onClick={() => navigator.clipboard.writeText(user.referralCode)} style={{ marginTop: 8 }}>
              Kopyala
            </Button>
          </Card>
        </Col>
      </Row>

      <Card title="Öğrencilerim" extra={<Button type="link" href="/students">Tümünü Gör</Button>} bordered={false} style={{ borderRadius: 16 }}>
        {students.length > 0 ? (
          <Table dataSource={students.slice(0, 5)} columns={columns} rowKey="id" pagination={false} />
        ) : (
          <Empty description="Henüz öğrenciniz yok" />
        )}
      </Card>
    </div>
  );
};

// Student Dashboard Content Component  
const StudentDashboardContent: React.FC<{
  user: { name: string; email: string; currentWeight?: number; targetWeight?: number; height?: number };
  coach?: { name: string; email: string } | null;
  activeProgram?: any;
  activeDiet?: any;
}> = ({ user, coach, activeProgram, activeDiet }) => {
  return (
    <div>
      <Title level={2} style={{ marginBottom: 8 }}>Merhaba, {user.name} 💪</Title>
      {coach && (
        <Text type="secondary" style={{ marginBottom: 24, display: 'block' }}>
          Eğitmenin: <Text strong style={{ color: '#CD0000' }}>{coach.name}</Text>
        </Text>
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 16 }}>
            <Statistic title="Mevcut Kilo" value={user.currentWeight || '—'} suffix="kg" />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 16 }}>
            <Statistic title="Hedef Kilo" value={user.targetWeight || '—'} suffix="kg" valueStyle={{ color: '#22c55e' }} />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 16 }}>
            <Statistic title="Boy" value={user.height || '—'} suffix="cm" />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 16 }}>
            <Statistic 
              title="BMI" 
              value={user.currentWeight && user.height ? (user.currentWeight / ((user.height / 100) ** 2)).toFixed(1) : '—'} 
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Aktif Program" extra={<Button type="link" href={activeProgram ? `/programs/${activeProgram.id}` : "/programs"}>Detay</Button>} bordered={false} style={{ borderRadius: 16 }}>
            {activeProgram ? (
              <div>
                <Title level={5}>{activeProgram.name}</Title>
                <Text type="secondary">{activeProgram.days?.length || 0} gün / hafta</Text>
              </div>
            ) : (
              <Empty description="Henüz program atanmamış" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Aktif Diyet" extra={<Button type="link" href="/diet">Detay</Button>} bordered={false} style={{ borderRadius: 16 }}>
            {activeDiet ? (
              <div>
                <Title level={5}>{activeDiet.name}</Title>
                <Space>
                  <Tag color="green">{activeDiet.dailyCalorieTarget} kcal</Tag>
                  <Tag color="blue">{activeDiet.proteinTarget}g protein</Tag>
                </Space>
              </div>
            ) : (
              <Empty description="Henüz diyet atanmamış" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
        </Col>
      </Row>

      <Card title="Hızlı İşlemler" bordered={false} style={{ borderRadius: 16, marginTop: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={12} md={6}>
            <Button icon={<ExperimentOutlined />} block size="large" href="/analysis">Vücut Analizi</Button>
          </Col>
          <Col xs={12} md={6}>
            <Button icon={<ThunderboltOutlined />} block size="large" href="/programs">Programlar</Button>
          </Col>
          <Col xs={12} md={6}>
            <Button icon={<CoffeeOutlined />} block size="large" href="/diet">Diyet</Button>
          </Col>
          <Col xs={12} md={6}>
            <Button icon={<LineChartOutlined />} block size="large" href="/progress">Gelişim</Button>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default DashboardLayout;
