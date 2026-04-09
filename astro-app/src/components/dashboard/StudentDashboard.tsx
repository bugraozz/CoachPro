import React from 'react';
import {
  Row,
  Col,
  Card,
  Statistic,
  Avatar,
  Tag,
  Button,
  Progress,
  Typography,
  Space,
  List,
  Empty,
  Descriptions,
  Divider,
} from 'antd';
import {
  UserOutlined,
  ThunderboltOutlined,
  CoffeeOutlined,
  LineChartOutlined,
  ExperimentOutlined,
  TrophyOutlined,
  FireOutlined,
  HeartOutlined,
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

interface StudentDashboardProps {
  user: {
    name: string;
    email: string;
    currentWeight?: number;
    targetWeight?: number;
    height?: number;
  };
  coach?: {
    name: string;
    email: string;
  } | null;
  activeProgram?: any;
  activeDiet?: any;
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({ 
  user, 
  coach, 
  activeProgram, 
  activeDiet 
}) => {
  const bmi = user.currentWeight && user.height 
    ? (user.currentWeight / ((user.height / 100) ** 2)).toFixed(1)
    : null;

  const weightDiff = user.currentWeight && user.targetWeight 
    ? user.currentWeight - user.targetWeight 
    : null;

  return (
    <div>
      {/* Welcome Section */}
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>
          Merhaba, {user.name} 💪
        </Title>
        <Text type="secondary">
          Bugün harika bir gün olacak!
        </Text>
      </div>

      {/* Stats Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 16 }}>
            <Statistic
              title="Mevcut Kilo"
              value={user.currentWeight || '—'}
              suffix="kg"
              prefix={<FireOutlined style={{ color: '#f59e0b' }} />}
              valueStyle={{ fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 16 }}>
            <Statistic
              title="Hedef Kilo"
              value={user.targetWeight || '—'}
              suffix="kg"
              prefix={<TrophyOutlined style={{ color: '#22c55e' }} />}
              valueStyle={{ fontWeight: 700, color: '#22c55e' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 16 }}>
            <Statistic
              title="Boy"
              value={user.height || '—'}
              suffix="cm"
              prefix={<UserOutlined style={{ color: '#CD0000' }} />}
              valueStyle={{ fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 16 }}>
            <Statistic
              title="BMI"
              value={bmi || '—'}
              prefix={<HeartOutlined style={{ color: '#ef4444' }} />}
              valueStyle={{ 
                fontWeight: 700,
                color: bmi && parseFloat(bmi) > 25 ? '#f59e0b' : '#22c55e'
              }}
            />
            {bmi && (
              <Tag color={parseFloat(bmi) > 25 ? 'warning' : 'success'} style={{ marginTop: 8 }}>
                {parseFloat(bmi) < 18.5 ? 'Zayıf' : 
                 parseFloat(bmi) < 25 ? 'Normal' : 
                 parseFloat(bmi) < 30 ? 'Fazla Kilolu' : 'Obez'}
              </Tag>
            )}
          </Card>
        </Col>
      </Row>

      {/* Progress to Goal */}
      {weightDiff !== null && (
        <Card bordered={false} style={{ borderRadius: 16, marginBottom: 24 }}>
          <Title level={5} style={{ marginBottom: 16 }}>Hedefe İlerleme</Title>
          <Row gutter={24} align="middle">
            <Col flex="auto">
              <Progress 
                percent={Math.min(100, Math.max(0, 100 - (Math.abs(weightDiff) / (user.currentWeight || 1)) * 100))}
                strokeColor={{ '0%': '#CD0000', '100%': '#22c55e' }}
                trailColor="rgba(255,255,255,0.1)"
                size={['100%', 20]}
              />
            </Col>
            <Col>
              <Text strong style={{ fontSize: 18 }}>
                {weightDiff > 0 ? `${weightDiff.toFixed(1)} kg verilecek` : 
                 weightDiff < 0 ? `${Math.abs(weightDiff).toFixed(1)} kg alınacak` : 
                 'Hedefe ulaşıldı! 🎉'}
              </Text>
            </Col>
          </Row>
        </Card>
      )}

      {/* Main Content */}
      <Row gutter={[16, 16]}>
        {/* Coach Info */}
        <Col xs={24} lg={8}>
          <Card 
            title={
              <Space>
                <UserOutlined />
                <span>Eğitmenim</span>
              </Space>
            }
            bordered={false}
            style={{ borderRadius: 16, height: '100%' }}
          >
            {coach ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <Avatar 
                  size={80}
                  style={{ 
                    background: 'linear-gradient(135deg, #CD0000 0%, #A00000 100%)',
                    marginBottom: 16,
                  }}
                >
                  {coach.name.charAt(0).toUpperCase()}
                </Avatar>
                <Title level={4} style={{ margin: '0 0 4px 0' }}>{coach.name}</Title>
                <Text type="secondary">{coach.email}</Text>
                <Divider />
                <Button type="primary" block>Mesaj Gönder</Button>
              </div>
            ) : (
              <Empty description="Eğitmen atanmamış" />
            )}
          </Card>
        </Col>

        {/* Active Program */}
        <Col xs={24} lg={8}>
          <Card 
            title={
              <Space>
                <ThunderboltOutlined />
                <span>Aktif Program</span>
              </Space>
            }
            bordered={false}
            style={{ borderRadius: 16, height: '100%' }}
            extra={<Button type="link" href="/programs">Tümü</Button>}
          >
            {activeProgram ? (
              <div>
                <Title level={5}>{activeProgram.name}</Title>
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="Başlangıç">
                    {new Date(activeProgram.startDate).toLocaleDateString('tr-TR')}
                  </Descriptions.Item>
                  <Descriptions.Item label="Gün Sayısı">
                    {activeProgram.days?.length || 0} gün
                  </Descriptions.Item>
                </Descriptions>
                <Divider />
                <Button type="primary" block href={`/programs/${activeProgram.id}`}>
                  Programa Git
                </Button>
              </div>
            ) : (
              <Empty 
                description="Aktif program yok"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Text type="secondary">
                  Eğitmeniniz size bir program atadığında burada görünecek
                </Text>
              </Empty>
            )}
          </Card>
        </Col>

        {/* Active Diet */}
        <Col xs={24} lg={8}>
          <Card 
            title={
              <Space>
                <CoffeeOutlined />
                <span>Aktif Diyet</span>
              </Space>
            }
            bordered={false}
            style={{ borderRadius: 16, height: '100%' }}
            extra={<Button type="link" href="/diet">Tümü</Button>}
          >
            {activeDiet ? (
              <div>
                <Title level={5}>{activeDiet.name}</Title>
                <Row gutter={8} style={{ marginBottom: 16 }}>
                  <Col span={12}>
                    <Card size="small" style={{ textAlign: 'center', background: 'rgba(99,102,241,0.1)' }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>Kalori</Text>
                      <div style={{ fontWeight: 700, color: '#CD0000' }}>
                        {activeDiet.dailyCalorieTarget}
                      </div>
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card size="small" style={{ textAlign: 'center', background: 'rgba(34,197,94,0.1)' }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>Protein</Text>
                      <div style={{ fontWeight: 700, color: '#22c55e' }}>
                        {activeDiet.proteinTarget}g
                      </div>
                    </Card>
                  </Col>
                </Row>
                <Button type="primary" block href="/diet">
                  Diyete Git
                </Button>
              </div>
            ) : (
              <Empty 
                description="Aktif diyet yok"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Text type="secondary">
                  Eğitmeniniz size bir diyet atadığında burada görünecek
                </Text>
              </Empty>
            )}
          </Card>
        </Col>
      </Row>

      {/* Quick Actions */}
      <Card 
        title="Hızlı İşlemler"
        bordered={false}
        style={{ borderRadius: 16, marginTop: 16 }}
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Button 
              type="default" 
              icon={<LineChartOutlined />} 
              block 
              size="large"
              href="/progress"
            >
              Gelişim Takibi
            </Button>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Button 
              type="default" 
              icon={<ExperimentOutlined />} 
              block 
              size="large"
              href="/analysis"
            >
              Vücut Analizi
            </Button>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Button 
              type="default" 
              icon={<ThunderboltOutlined />} 
              block 
              size="large"
              href="/programs"
            >
              Programlarım
            </Button>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Button 
              type="default" 
              icon={<CoffeeOutlined />} 
              block 
              size="large"
              href="/diet"
            >
              Diyet Planım
            </Button>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default StudentDashboard;
