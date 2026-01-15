import { Heading, Text, Flex, Stack } from '.'

interface PageHeaderProps {
  title: string
  subtitle?: string
  breadcrumb?: string
  action?: React.ReactNode
  wide?: boolean
}

export function PageHeader({ title, subtitle, breadcrumb, action, wide = false }: PageHeaderProps) {
  return (
    <div className="bg-white border-b border-gray-200 py-6">
      <div className={`mx-auto px-4 ${wide ? 'max-w-[1600px]' : 'max-w-7xl'}`}>
        <Flex justify="between" align="center">
          <Stack spacing="xs">
            {breadcrumb && (
              <Text variant="small" color="muted">{breadcrumb}</Text>
            )}
            <Heading level={1}>{title}</Heading>
            {subtitle && (
              <Text color="muted">{subtitle}</Text>
            )}
          </Stack>
          {action && (
            <div>{action}</div>
          )}
        </Flex>
      </div>
    </div>
  )
}