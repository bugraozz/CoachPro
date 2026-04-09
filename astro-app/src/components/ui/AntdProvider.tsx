import React from 'react';
import { ConfigProvider, theme } from 'antd';
import trTR from 'antd/locale/tr_TR';

interface AntdProviderProps {
  children: React.ReactNode;
}

const AntdProvider: React.FC<AntdProviderProps> = ({ children }) => {
  return (
    <ConfigProvider
      locale={trTR}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#CD0000',
          colorSuccess: '#22c55e',
          colorWarning: '#f59e0b',
          colorError: '#CD0000',
          colorInfo: '#06b6d4',
          colorBgBase: '#EFEDE6',
          colorBgContainer: '#ffffff',
          colorBgElevated: '#ffffff',
          colorBorder: '#E5E3DB',
          colorBorderSecondary: '#DCD9D0',
          borderRadius: 12,
          fontFamily: "'Geist Variable', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        },
        components: {
          Layout: {
            siderBg: '#EFEDE6',
            headerBg: '#ffffff',
            bodyBg: '#EFEDE6',
          },
          Menu: {
            darkItemBg: 'transparent',
            darkItemSelectedBg: 'rgba(205, 0, 0, 0.15)',
            darkItemHoverBg: 'rgba(0, 0, 0, 0.05)',
            itemBorderRadius: 10,
            itemMarginInline: 8,
            itemPaddingInline: 16,
          },
          Card: {
            colorBgContainer: '#ffffff',
            colorBorderSecondary: '#2a2a3a',
          },
          Button: {
            borderRadius: 10,
            controlHeight: 40,
          },
          Input: {
            borderRadius: 10,
            controlHeight: 42,
            colorBgContainer: '#ffffff',
          },
          Select: {
            borderRadius: 10,
            controlHeight: 42,
          },
          Table: {
            colorBgContainer: '#ffffff',
            headerBg: '#ffffff',
            rowHoverBg: 'rgba(255, 255, 255, 0.03)',
          },
          Modal: {
            contentBg: '#ffffff',
            headerBg: '#ffffff',
          },
          Statistic: {
            contentFontSize: 28,
          },
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
};

export default AntdProvider;

