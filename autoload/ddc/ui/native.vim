function ddc#ui#native#_show(event, overwrite, insert, pos, items) abort
  " NOTE: Skip if item is selected
  const selected = complete_info().selected
  if a:event ==# 'Update'
        \ && (selected > 0
        \     || (&l:completeopt !~# 'noinsert' && selected == 0))
    return
  endif

  if has('nvim')
    call s:complete(a:overwrite, a:insert, a:pos, a:items)
  else
    " Debounce for Vim8
    if 's:completion_timer'->exists()
      call timer_stop(s:completion_timer)
    endif
    let s:completion_timer = timer_start(
          \ 10, { -> s:complete(a:overwrite, a:insert, a:pos, a:items) })
  endif
endfunction

function ddc#ui#native#_hide() abort
  if mode() ==# 'i' && &l:modifiable
    call complete(1, [])
  endif

  call s:restore_completeopt()
endfunction

function ddc#ui#native#_on_complete_done() abort
  let g:ddc#ui#native#_skip_complete = v:true
  " Reset skip completion
  autocmd ddc InsertLeave,InsertCharPre * ++once
        \ let g:ddc#ui#native#_skip_complete = v:false

  call ddc#on_complete_done(v:completed_item)
endfunction

function ddc#ui#native#_indent_current_line() abort
  call feedkeys("\<C-f>", 'n')
endfunction

function s:complete(overwrite, insert, pos, items) abort
  if mode() !=# 'i'
    return
  endif

  " NOTE: Disable completion messages
  set shortmess+=c

  if !'s:save_completeopt'->exists()
    let s:save_completeopt = &l:completeopt
  endif

  if a:overwrite
    call s:overwrite_completeopt()
  endif

  if a:insert
    setlocal completeopt-=noinsert
    setlocal completeopt-=noselect
  endif

  " Note: It may be called in map-<expr>
  silent! call complete(a:pos + 1, a:items)
endfunction

function s:overwrite_completeopt() abort
  " Auto completion conflicts with 'completeopt'.
  setlocal completeopt-=longest
  setlocal completeopt+=menuone
  setlocal completeopt-=menu

  if &l:completeopt !~# 'noinsert\|noselect'
    setlocal completeopt-=noinsert
    setlocal completeopt+=noselect
  endif
endfunction

function s:restore_completeopt() abort
  if 's:save_completeopt'->exists()
    " Restore completeopt
    let &l:completeopt = s:save_completeopt
    unlet s:save_completeopt
  endif
endfunction
