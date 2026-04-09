import React from 'react';
import {
  Row,
  Col,
  Card,
  Statistic,
  Table,
  Avatar,
  Tag,
  Button,
  Progress,
  Typography,
  Space,
  List,
  Empty,
} from 'antd';
import {
  TeamOutlined,
  ThunderboltOutlined,
  CoffeeOutlined,
  RiseOutlined,
  UserAddOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

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

interface CoachDashboardProps {
  user: {
    name: string;
    referralCode: string;
  };
  students: Student[];
  stats: {
    totalStudents: number;
    activePrograms: number;
    activeDiets: number;
  };
}

const CoachDashboard: React.FC<CoachDashboardProps> = ({ user, students, stats }) => {
  const columns = [
    {
      title: 'Öğrenci',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Student) => (
        <Space>
          <Avatar 
            style={{ 
              background: 'linear-gradient(135deg, #CD0000 0%, #A00000 100%)',
            }}
          >
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
      title: 'Hedef',
      dataIndex: 'targetWeight',
      key: 'targetWeight',
      render: (weight: number) => weight ? (
        <Text style={{ color: '#06b6d4' }}>{weight} kg</Text>
      ) : '—',
    },
    {
      title: 'Program',
      key: 'program',
      render: (_: any, record: Student) => (
        record.programs?.length > 0 ? (
          <Tag color="success" icon={<CheckCircleOutlined />}>Aktif</Tag>
        ) : (
          <Tag color="warning">Yok</Tag>
        )
      ),
    },
    {
      title: 'Durum',
      dataIndex: 'active',
      key: 'active',
      render: (active: boolean) => (
        <Tag color={active ? 'green' : 'red'}>
          {active ? 'Aktif' : 'Pasif'}
        </Tag>
      ),
    },
    {
      title: 'İşlem',
      key: 'action',
      render: (_: any, record: Student) => (
        <Button type="link" href={`/students/${record.id}`}>
          Detay
        </Button>
      ),
    },
  ];

  return (
    <div>
      {/* Welcome Section */}
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>
          Hoş geldin, {user.name} 👋
        </Title>
        <Text type="secondary">
          İşte bugünkü özetin
        </Text>
      </div>

      {/* Stats Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card 
            bordered={false}
            style={{ 
              background: 'linear-gradient(135deg, #CD0000 0%, #A00000 100%)',
              borderRadius: 16,
            }}
          >
            <Statistic
              title={<Text style={{ color: 'rgba(255,255,255,0.8)' }}>Toplam Öğrenci</Text>}
              value={stats.totalStudents}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#fff', fontWeight: 700 }}
            />
            <div style={{ marginTop: 8 }}>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
                <ArrowUpOutlined /> Bu ay +2
              </Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card 
            bordered={false}
            style={{ 
              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              borderRadius: 16,
            }}
          >
            <Statistic
              title={<Text style={{ color: 'rgba(255,255,255,0.8)' }}>Aktif Program</Text>}
              value={stats.activePrograms}
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: '#fff', fontWeight: 700 }}
            />
            <div style={{ marginTop: 8 }}>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
                Devam ediyor
              </Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card 
            bordered={false}
            style={{ 
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              borderRadius: 16,
            }}
          >
            <Statistic
              title={<Text style={{ color: 'rgba(255,255,255,0.8)' }}>Aktif Diyet</Text>}
              value={stats.activeDiets}
              prefix={<CoffeeOutlined />}
              valueStyle={{ color: '#fff', fontWeight: 700 }}
            />
            <div style={{ marginTop: 8 }}>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
                Takipte
              </Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card 
            bordered={false}
            style={{ 
              background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
              borderRadius: 16,
            }}
          >
            <Statistic
              title={<Text style={{ color: 'rgba(255,255,255,0.8)' }}>Referans Kodu</Text>}
              value={user.referralCode}
              valueStyle={{ color: '#fff', fontWeight: 700, fontSize: 20 }}
            />
            <div style={{ marginTop: 8 }}>
              <Button 
                size="small" 
                ghost 
                onClick={() => navigator.clipboard.writeText(user.referralCode)}
              >
                Kopyala
              </Button>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Main Content */}
      <Row gutter={[16, 16]}>
        {/* Students Table */}
        <Col xs={24} xl={16}>
          <Card 
            title={
              <Space>
                <TeamOutlined />
                <span>Son Öğrenciler</span>
              </Space>
            }
            extra={<Button type="link" href="/students">Tümünü Gör</Button>}
            bordered={false}
            style={{ borderRadius: 16 }}
          >
            {students.length > 0 ? (
              <Table
                dataSource={students.slice(0, 5)}
                columns={columns}
                rowKey="id"
                pagination={false}
                size="middle"
              />
            ) : (
              <Empty 
                description="Henüz öğrenciniz yok"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Paragraph type="secondary">
                  Referans kodunuzu paylaşarak öğrenci ekleyebilirsiniz
                </Paragraph>
              </Empty>
            )}
          </Card>
        </Col>

        {/* Quick Actions & Activity */}
        <Col xs={24} xl={8}>
          <Card 
            title={
              <Space>
                <ThunderboltOutlined />
                <span>Hızlı İşlemler</span>
              </Space>
            }
            bordered={false}
            style={{ borderRadius: 16, marginBottom: 16 }}
          >
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              <Button 
                type="primary" 
                icon={<UserAddOutlined />} 
                block
                size="large"
                href="/students"
              >
                Öğrenci Listesi
              </Button>
              <Button 
                icon={<ThunderboltOutlined />} 
                block
                size="large"
              >
                Yeni Program Oluştur
              </Button>
              <Button 
                icon={<CoffeeOutlined />} 
                block
                size="large"
              >
                Yeni Diyet Planı
              </Button>
            </Space>
          </Card>

          <Card 
            title={
              <Space>
                <ClockCircleOutlined />
                <span>Son Aktiviteler</span>
              </Space>
            }
            bordered={false}
            style={{ borderRadius: 16 }}
          >
            {students.length > 0 ? (
              <List
                dataSource={students.slice(0, 4)}
                renderItem={(student) => (
                  <List.Item style={{ padding: '12px 0' }}>
                    <List.Item.Meta
                      avatar={
                        <Avatar style={{ background: '#CD0000' }}>
                          {student.name.charAt(0)}
                        </Avatar>
                      }
                      title={student.name}
                      description={
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {new Date(student.createdAt).toLocaleDateString('tr-TR')} tarihinde katıldı
                        </Text>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty 
                description="Henüz aktivite yok"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default CoachDashboard;
