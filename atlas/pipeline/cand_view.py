import json,sys,re
c=json.load(open(f'cand/{sys.argv[1]}.json',encoding='utf-8')); lim=int(sys.argv[2]); last=''
for s in c['sections']:
    if s['file']!=last: last=s['file']; print('\n@@',last)
    z=s['zh_txt'][:lim if s['lvl']=='3' else lim//2]
    print(('## ' if s['lvl']=='2' else '- ')+s['zh']+' | '+s['de'][:60]+' #'+s['id']+(' :: '+z if z else ''))
print('\nBOLD:', '; '.join(a+'='+b for a,b in c['bold'].items()))
