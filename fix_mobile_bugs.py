import os

hr_path = 'src/HrModule.jsx'
app_path = 'src/App.jsx'

with open(hr_path, 'r', encoding='utf-8') as f:
    hr_lines = f.readlines()

for i in range(len(hr_lines)):
    # Fix staff list table (line 144)
    if '                    <table className="w-full text-left text-sm">\n' == hr_lines[i] and '                  ) : (\n' in hr_lines[i-1]:
        hr_lines[i] = '                    <div className="overflow-x-auto w-full no-scrollbar"><table className="w-full min-w-max text-left text-sm whitespace-nowrap">\n'
    
    # Fix staff list table closing tag
    if '                    </table>\n' == hr_lines[i] and '                      </tbody>\n' in hr_lines[i-1] and '                  )}\n' in hr_lines[i+1]:
        hr_lines[i] = '                    </table></div>\n'
        
    # Fix other tables
    if '                    <table className="w-full text-left text-sm border-collapse">\n' == hr_lines[i]:
        hr_lines[i] = '                    <table className="w-full min-w-max text-left text-sm border-collapse whitespace-nowrap">\n'
    elif '                      <table className="w-full text-left text-sm">\n' == hr_lines[i] and '                    <div className="overflow-x-auto">\n' in hr_lines[i-1]:
        hr_lines[i] = '                      <table className="w-full min-w-max text-left text-sm whitespace-nowrap">\n'
    elif '                    <table className="w-full text-left text-sm">\n' == hr_lines[i] and '                  <div className="overflow-x-auto">\n' in hr_lines[i-1]:
        hr_lines[i] = '                    <table className="w-full min-w-max text-left text-sm whitespace-nowrap">\n'

with open(hr_path, 'w', encoding='utf-8') as f:
    f.writelines(hr_lines)

with open(app_path, 'r', encoding='utf-8') as f:
    app_lines = f.readlines()

for i in range(len(app_lines)):
    if '<aside className={`fixed md:relative top-0 left-0 h-full w-72 md:w-64 glass-dark text-slate-300 flex flex-col justify-between shadow-2xl z-50 md:z-10 transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? \'translate-x-0\' : \'-translate-x-full md:translate-x-0\'}`}>' in app_lines[i]:
        app_lines[i] = app_lines[i].replace('glass-dark', 'bg-slate-900 md:bg-transparent glass-dark transform z-[60]')
        app_lines[i] = app_lines[i].replace('z-50', 'z-[60]')

with open(app_path, 'w', encoding='utf-8') as f:
    f.writelines(app_lines)

print("Files patched successfully.")
