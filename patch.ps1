
$file = "astro-app/src/pages/programs/index.astro"
$content = Get-Content $file -Raw
$old = "                  <span class={`px-2.5 py-1 rounded-full text-xs font-semibold `${program.status === 'active' ? 'bg-accent-green/15 text-accent-green' : 'bg-text-muted/15 text-text-muted'}`}>`n                    {program.status === 'active' ? 'Aktif' : 'Pasif'}`n                  </span>"
$old = $old.Replace("`r", "")
$content = $content.Replace("`r", "")

$new = "                  <div class=`"flex items-center gap-2`">`n                    <span class={`px-2.5 py-1 rounded-full text-xs font-semibold `${program.status === 'active' ? 'bg-accent-green/15 text-accent-green' : 'bg-text-muted/15 text-text-muted'}`}>`n                      {program.status === 'active' ? 'Aktif' : 'Pasif'}`n                    </span>`n                    <a href={`/students/`${program.user.id}/program/`${program.id}/edit`} class=`"px-3 py-1.5 rounded-lg bg-accent-primary/10 text-accent-primary text-xs font-medium hover:bg-accent-primary/20 transition-colors`">Düzenle</a>`n                    <button onclick={`if(confirm('Programý silmek istediðinize emin misiniz?')) { fetch('/api/programs/`${program.id}', {method: 'DELETE'}).then(r => r.ok ? window.location.reload() : alert('Bir hata oluþtu')) }`} class=`"px-3 py-1.5 rounded-lg bg-accent-red/10 text-accent-red text-xs font-medium hover:bg-accent-red/20 transition-colors`">Sil</button>`n                  </div>"

$content = $content.Replace($old, $new)
Set-Content -NoNewline -Encoding utf8 $file $content

