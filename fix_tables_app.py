import os

app_path = 'src/App.jsx'

with open(app_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i in range(len(lines)):
    # 1. Staff List Table (line ~1662)
    if '                    <table className="w-full text-left text-sm">\n' == lines[i] and '                  ) : (\n' in lines[i-1]:
        lines[i] = '                    <div className="overflow-x-auto w-full no-scrollbar"><table className="w-full min-w-max text-left text-sm whitespace-nowrap">\n'
        # find closing tag
        for j in range(i+1, min(i+100, len(lines))):
            if '                    </table>\n' == lines[j] and '                      </tbody>\n' in lines[j-1]:
                lines[j] = '                    </table></div>\n'
                break

    # 2. Shift Roster Table (line ~1749)
    if '                    <table className="w-full text-left text-sm border-collapse">\n' == lines[i]:
        lines[i] = '                    <table className="w-full min-w-max text-left text-sm border-collapse whitespace-nowrap">\n'

    # 3. Leave Management Table (line ~1824)
    if '                      <table className="w-full text-left text-sm">\n' == lines[i] and '                    <div className="overflow-x-auto">\n' in lines[i-1]:
        lines[i] = '                      <table className="w-full min-w-max text-left text-sm whitespace-nowrap">\n'

    # 4. Payroll Table (line ~1881)
    if '                    <table className="w-full text-left text-sm">\n' == lines[i] and '                  <div className="overflow-x-auto">\n' in lines[i-1]:
        lines[i] = '                    <table className="w-full min-w-max text-left text-sm whitespace-nowrap">\n'
        
    # 5. ESS Leave Table (line ~2297)
    if '                  <table className="w-full text-left text-sm">\n' == lines[i] and '                <div className="overflow-x-auto">\n' in lines[i-1]:
        lines[i] = '                  <table className="w-full min-w-max text-left text-sm whitespace-nowrap">\n'

with open(app_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("App.jsx tables patched.")
