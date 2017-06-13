# Configure dovecot

## conf.d/auth-dict.conf.ext
```
passdb {
  driver = dict
  args = /etc/dovecot/dovecot-dict-auth.conf.ext
}

userdb {
  driver = prefetch
}

userdb {
  driver = dict
  args = /etc/dovecot/dovecot-dict-auth.conf.ext
}

```

## dovecot-dict-auth.conf.ext
```
uri = proxy:<path to dict socket>
user_key = userdb/%u
password_key = passdb/%u/%m/%w
iterate_disable = yes
```
