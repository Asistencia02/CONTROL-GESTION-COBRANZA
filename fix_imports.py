
with open('src/renderer/modules/ReportesFinancierosModerno.tsx', 'r', encoding='iso-8859-1') as f:
    content = f.read()

old_import = "import { useConfiguracion } from '@renderer/hooks/useConfiguracion'"
new_import = "import { useConfiguracion } from '@renderer/hooks/useConfiguracion'\nimport { useReportesAvanzados } from '@renderer/hooks/useReportesAvanzados'"

content = content.replace(old_import, new_import)

with open('src/renderer/modules/ReportesFinancierosModerno.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('OK')
