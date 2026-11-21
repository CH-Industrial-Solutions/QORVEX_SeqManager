/*! QORVEX · © 2026 CH Industrial Solutions · Todos los derechos reservados. Software propietario: prohibida su copia, modificación o distribución sin autorización por escrito. Ver LEGAL.md y LICENSE.txt. */
/* =====================================================================
   QORVEX LABELS — etiquetas 6 × 4 in (Validación · Secuencia · Línea)
   Módulo compartido por QORVEX (Motor) y QORVEX MOBILE.
   Todo vive en la carpeta Data Base / Etiquetas:
     Etiquetas_Consecutivos.txt  último ID por operación, componente y línea (se reescribe con candado)
     Etiquetas_<EQUIPO>_<AAAA-MM>.txt  registro (cada equipo escribe solo el suyo; solo agrega líneas)
     Etiquetas_candado.json      candado de reserva (dura segundos)
   Nunca se reutiliza un ID: al reservar se toma el mayor entre el consecutivo y lo ya registrado.
   ===================================================================== */
(function (G) {
  'use strict';
  const DIRN = 'Etiquetas', CONS = 'Etiquetas_Consecutivos.txt', LOCK = 'Etiquetas_candado.json';
  const OPS = ['Validación', 'Secuencia', 'Devolución', 'Línea'], MAXQ = 500, MAXP = 999;
  const HEAD = ['Fecha', 'Hora', 'Equipo', 'No. Empleado', 'Nombre', 'Operacion', 'Componente', 'Linea', 'ID', 'Posicion', 'Lote', 'Estado', 'Impresora', 'Registrado', 'Motivo'];
  const CHEAD = ['Operacion', 'Componente', 'Linea', 'Prefijo', 'Ultimo', 'Actualizado', 'Equipo'];
  const RE = /^Etiquetas_([A-Z0-9_-]+)_(\d{4}-\d{2})\.txt$/;
  const T = { stale: 20000, wait: 15000, retry: 700, verify: 400 }; // candado (ms)
  const QLOGO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAaQAAABkCAIAAABGsdNiAABVtklEQVR42u19d5wkVbX/Oefequo4cWdzjiwsOWdQECQ/FAMgIgj4DE8lmeA9A0gQEUUQszwUAyAGBEGy5AwL7LJsno2zkztW1b3n/P6o7p6esLszs4Ph/fp86rM709PddevWre898XtQROBfQ1jAWLEsAIAIACAAxkpoo1eQEBQhACgERYiIiKIQozfXpCY1qck2RP8Tzy0CAiAiAsAMDBIaMSwsQkgAIoChZWYQAEVACFSCQlQoikATAgEhEtVuZU1qUpNtCf7jNTsrYK0ICAtaEWvFcAnvLIthCAwjASIyi2WxDALgKCQEBABEQiAETehqchUQoqPQVTUVryY1qcm/gGYnAMxiBUIrViQ0YkvoVvrBilgBP5CQOcItK2IZjBUBcRQpAoTImAVNpBE8RxyFhOJqiml0FDoKI1O3JjWpSU3+0Zodi4hAyGIZDItv2AqERljAWgkZfGNDK1YwCLkYsmGQkg7IzMACgOho0IQIgAgKUSNqQleDp5WjwFXoKHAUpTyKOaQIqKbm1aQmNfmHaXYiYBhCy4horIQsoZXQQmjZCIRGfMt+KL4RY4UBfMPFgA0Dg1iWwEBoWQS0QqWQCFCAALUCV5FDGHfR0+xp8jTGHFKGrQADxDQ5Smp4V5Oa1OQfAXbGimEJjIRWDHOk2flWQiuB5cBKYKRouBBwIYhwkAOLoWXDElo2DIZFEEQgctcRCDIQokOYjFHSVb6QCiCmJeZgwogC8A2JKImJYUo4NS9eTWpSk3cY7CJnnGEIWHzLoYF8wCFLIWTfim/EN1wIJR/YfMDRnwIrgY2QEfyQQxEmYStGILQCAmBBE3gOxR1KuJTwlEcYJ0x6KhWjuphKOGgEIltXoxWBlFcL09akJjV5x8BOACLMKhrO+xww+wZyIRdDLhrJB5wPbSGUTNHmQy6EkvGNb8QSBCK+5YA5H7JvIVuwvuUwEBZhC5rI1RDTlHKpztVxh+IKE4rq47oxpYqW62LKQetbFTLENFkWRdrTWLNna1KTmow92FkW30ghZMtQCDjj23zIvpWQpRhyLpDeosmG3Fu0vUXOhjYTcCbggrFbMiYb2iJLQSQAy4iGWQQtCAgCAFlQPiSQUo6q0zZBVB+n5qQOQRgkZC764mkMLFiBpCYU5TmWRXkadU3Dq0lNamA35khXDLkYcsiQ8W2vb/OhFEIuhJwLuKtgewo2er0nsL0h94S2o2gyxnQV2SCAg+ICOAgKoJxZ5wAAggjYAH1g16Ws2FAYXB1HiQvnQusU0bE2dMjR6IWoEAqG/FBAmFlSnqqpdzWpSQ3sxkwMQzFk30hgJetzr29zAfcUbM5IPrCdObs5Z7qLYTaUjoJpC0yvsZnQ5JhFETQIJADToOOQQEkTNzrsEcRAPBBCCIEDAAtiAAw6gWCnobYCkqg0Oi2s632ahfGY9SaITiHFFAqAz8KBIEDCJaql4NWkJjWwGwu1DkIrRSO+kcBCLuRcwPlQen3bVbQ5Y3sD7jJmfRBuzIabc6YXLMcQUgJpjKepPgUNYhrZb5KwwYGYQiscgBiAELAIFACEYH2AAqAPbBCtq8IkGbRbkNcaCz5AsWdSl7egx921IbEoTMwxsUkJx/MQCRmgZsvWpCb/38rYJBVbLkVRcwFnirYQcijSnjU9PmcDbs+HG3vCnsB2i9lUCFf3hhsLoSQQ4kJ12DCRpqpi4/q2eOuWtOXG8XVOSzqXcHuIesDxQUKQEMgH9AEMQAjgA1hAK2Ch70BUAiioXdAOasdAPBPModjRzemTpjfsMTFZGqpIzaCtSU1qYDdKiVJJfCOZou0u2kIoRcttGdNZMD2+3ZgJN2XC9dlwVc7vDGyYAGkU3QIT63FaUKhb1uqubdMOYkMyMbWJJ6R7kApMIVABoAjiAwSARYAAJAS0ABZQABmQgQQQgFAQBAUALKARRAAGseSik1Q6XSgeU1//4enNh89MI6IAiEDNoq1JTWpgNzIJDOdDDiwUQ+4u2I6cKYScDXhDJtySNVsKZnU2WJsL1vtBVgnUideC0xrULD/TtG4TtXWABzRtnDdpfEGpXGhzxhSBDCgDkAVbBPGBAsAAIAAIAQUAgAAUAAITMEYpeCVhAFNS9pABSRDJFjFBiYTxj2tJXrBg3EHT6moqXk1qUgO7ERqwAsWAc6EthpIPuadou/K2u2g7CmZ9d7ghG7YWgqUdxU1ByI2oJ8u0FpiT7ZmwuStpDSY8HJcME16BKR+IL+CjFBBzIEXgAKAA4AOGgBbIABgAAAcAAQgs9uFaBHZcRjoovyIAEKmCQhZZJOElkgGfODn+hX0mzhuXiDimaipeTWpSA7vtCIsUQyka6S3aQih5YztztiNvNmfDDZlwUzZc1u0vzwUdKpAmrJtIO3vF6Stavd5ed3ydmtwUuG7RoM9UAMggFwF8QB8kD+KDBCAWIAA0gABKQAFQH8yFALbsw+Pyz9EPCIARywqAlA8GsKAMiogTT87A8MI9xl2w9wRAZHlnq2gtS42IpSY1+TcGOxYJjRSN5EPuyttswJnAtmfNpqxp7Q1aM8EaP1i8pVAgcCbLlGm8qKcj/dYGryVGM8cFOlEIuSimiOCDKgDmQYqAPoAPUgQxkfMNUAAhgjlRIAimDHAhgCkDWeVFWwY4KOt30B/1AMCA8oGJmuqTJ0yirx8+ZXpjzAqosYYjEUHEYsgm5FRCC0AN8GpSk39LsDMWCqHNBpwLuLdoe3y7JWfXdQXre4M12fD1nkKrDfJxiDXzLk28qGOL7uqhKXWm3suGyhddRCkAFwAKgHmAPEgAZABDkLCEThE4EIIGUAIIFtAv6XsQVKGe7fPTlTQ7KVu1CEBVqBe59hjICDGpZGLPOnP1u6ccPq/BihCMJXGACCBCZyYIDU9ojNWWWk1q8m8JdlagGHKUaJINuCNvugu2tStY0xWsyfhLMv5bflEaKTXd7qkyC3vyEHOCdCIUyBjTiUxABqgHIFLoCiAFkBBIABikDFGko2ArElqSEMSAWBGLUfoJhkIBokUxIlbEgDCWUI/LhwCoKrWu6lojRyDF9ZQEXXZg87mHTmIBLLe/GAOwA0CADV2+H9pZ4xMR9tWkJjX5Z8lokopFwNioLEyiwGtvkbdkzfrecF0uXNJTXBEG0IItE+1+mJ3R3VtMeb1xxw8DizqHSsDNgPSW1DrwQQxAUAqzAgAiIKECQQMIruc4nitaB6xzobYWkYGAHWSlwpgbWjJFDrNGgkCFAgLMLBZLWh5XWY+VEzCICwJgLUhvuDaHX3ws25lZd8lxUy2PnX4nAAgZ34TG1tZZTWrybwl2liG0XAxtIZRcwFnfdubDTdlwXSZY2lNcFYZBA0yczIfq3IQg6GxqyiCExhYQA+AiUBFMDjgPVAQIwDIQAwgIABIAAlokN570lBPLZmaw7KH1wmR8WsJrdt0GVB6hJvStZAK7ORes6wlWdvqvbTRvWsy6sUKANl9U1kooYlG4CuaifxEEAPxStIMZ0Uh3Z+7qZ0A56y88egqL4Ni513zDPUULEJEZ1FS7mtTk3wrsACWwEjIUDWcD3pwxazrDtb3B6+3Fpb4fTpKpE+3BbiHJdkPMzQkEIj6SD5QHzoPkgAMAA+wDWAAFSIAAFgHRcepiblOheFjMPaK+af/Z06fGY4lhMJYIy/pM8Oam3MMre+9ZUliVS+U5VDYQELblfBQq+/Ko7LyLGjYSMtrentyVj9nG1KaPHTiRxyLlOEK3HEuHX9PsalKTf0+wYwFjoWg4H3Iu5M6C6bXcZsPW0A/TOLXFHhIruGw2IRYFA5ACSBGgCFIAyYMUgRjAAgMggWYRQkZHNbnezqJOaxx/4vzm6fE+jz4DVDsWK0amRGlyAICgCKfWe1PrvfcsaLr4kOC+t7t/8nTnS+sTuWygTChGmMt61YCwaKnWAgltd5j/8l/t9Abv3QsbxyofpWBtT2D6kHVM7GMZZVQJEd4J7mbm8oBG991Suq0jHZ6IlKNRVUtiLGS7I9nGid4hduxtX9o2ThqtljGZGUQUEaJ+T8ZwvnlH5kTKiQ1bOxcO+wR6hDMOhqUYsm85W+RswB0505Y3Gwvh273F3rStn0wHxsMEF1rRLQLmAQKAIkABpADWB/FLGSOlEIQCZCUNydTeoTpv0oRjxrWktYqukEWi/tcEW4kaYJ9dWP20jUu7H9lr/Gm7NN/9UteND21+cWMy8PMEIqrKcVd5QAiAAQCsi8CyebP5zB/W3TspPrMhtsP6HQJA3nKG7ZisdRYBgFJzcNyh7xERRbSDj6W1LCCKIi4ZHCvcZOFhjq38HnwngEZELDMCEg0x3dsGlzHHu1F8Z/VMIo7hXoujALLo6RzFtESPaeWDOzixowS7bJF7CrYrbzpydlMmeHNzYZUfxubSvo2FBBdXgVsEKgBGJRBFgCKADxICmtJ8EQISgBOPzbXmwuaJZ06cGJmrVgQRCWBEtVzV6zHSM2Ke+vCB447freG6v2y6+dFCR14pEwqiRPFZKNuzAqBABKwAIKqQ3+5wv3hv662nzXa02pHkOBEBxCzbXg53VG8CUUSVCSkUg83t3flCwMyAffH06IfKg4GIlZUuIqlkbNL4RtfRle+pPMyjgDkiVKrkXtiwuXNze082V+zJ5DGiHWQrAsZY7j+kqpsVnVdEoL4u0dxYl4y782ZOIkICFY2NtgfquXwxV/AjdSNSXiwzswAAW7bM0Z84mkGQgVjAfa8Qlb5EKUynEhPHNRChVqpyvZWLjc4LgMyRRisAQETRtRBiOhUfW7yLvq0nk7NWKjcrmldEFAEirE8nKieNrqsyk+1dvRs2d1nLY6PZAYxvrpsyoamCXx1dGRbRiqJlWL38ohECQENdchSQXXpARTrCkAAFhIUrmg8CohAioEBY8JvrEkQ0ZmAnEnWwlsBKzudskbsKdmM2XJ81rfkAJ+D8hnAi+8uBe8ET4AJIBewCEAtYMTtRgEiaU+lj0fvqTjNnJWNQDpzueL0qIZaYPkXqkvrrH5j6nt3Tn799/curUYIACPtZshWlJABwgF1RvcUH3q777uOtl757Ju/IqkUAgJzl3Gg1u0gLU0QA2N6ZeezZN599dfkzLy3t7Mlubu8pFMNBGy0Ochv2bZCJmDOxpaGxLnnQvjvvufPMIw7YeXxzfQW5hnmZZUQgAHjqpbce+PtrDz3x2oq1m3tzPiAMFYHBbdmulVEKaIK5syYtmDXlmMN2P+FdezU1pAajTEWMZa3ohp/95Ye/fcxBG1gjjCLCIGwYAITZSpRwhBy1ZMcBW0iEwyXXBpb3DCJIJeMTxjU21ScO23/R4fstPHz/nZUiZolwnAiXrFh/5uduRBDDLMIR2CEAAgGpGy7/yLGH72mZFY0Bo1j0Pb//67Nf/NavQSwzl53UgAREFITwy+986pB9dmIWpbAyY68va737/mcfemLx6g1b2ruyY6PZiaD2zj7lgBu/dq5lJiQAWbep46OX3NTZnY85GJqq/QNLI2Sg9x62+41fPUdEIit4+EjXG5gvvb3q0UKWLCgLlqwD4IC4Ah6gZoo7OKloT0ok37PXgu2C6Qjy7KLisCiFeHOvae32V/cESzr9pzdl31b+nNmwWzK3WWwvoA/iAxVACoAhoA8sUHGvEAoA4pR46lMNzZfMmqYIrQi9M64OAbBWtMK1W4oX3LL6oWW+IJuwnLCMZYo7Kv8QAxJAjyZPpT+fMXv3yalR8wVEH/zhko3Lstlv7ztvpEYxc2kbf2vl+h/95uG77numozsPiCIMIiB9lSLbNqn64Q5SpFSBSGN97L2H7/XJM4/efeHM6OHf7iqsDOmpF5dedcufHnn6DSQFwiIWQQaMApGG/QSxCIgAoEIkQBzfkDz1vftfeO7xk8Y3Dol3Edh94erbbv7142IKUDqX9EfRobF1WB47iCZKCdt9d5v1hQtOPvbwPaLJZBal6GOX3nzn/S+LKQ5wsCDqmVMan/79lYmYt+Me0mhryeQKe514SVtHXqT/rimMOvb+Y/b6+bWfjGYpQsa3V2288qa7737gOQYFYkUiqowx8NlpUhbV+R88/Lovf9RYq5WKlsQTLyw97dM3ZPO+2BCGuO+C5J5x4v63XHk+i+AwrNHo2Wn3/fOWLn+Y3d7eLGiFJArAA/CAYwDKWh3XC5m+OH3yoRPGDccIU1/96leHr8Qalp6C7cnbosiG3nBDd7gq57/UkY9NoUWNxQwUN4FTBCqAXwTHB4zYSsq5ugqASBCVjNfxGyZPv2DGZEJkAPWOtTxEACJkhoaUPn6v+jUb84vXWbBWRWl9VJV4XAY+IVAKshjryPW+b9G4Ua9YASDE57ozm/zwuMnNAiNQEqM1FITmiu/f9Z+X/eTZ11blCwVCqwAALOJozGtEJGQEjuhi8sXg9bc33Hrno7lC8eC9FzhaM29rhNGQ8gX/s1//xSVX/Wr1+g5Cq0pVKRihVf9j+NI3PAJA4Ey++OIbrXfe+9SMKS0L506JTNoB+y4RPvrMm8+9tkKjSPQIlfw7Qx5DyEA3SNn4QgBCJgQSBrQb2nrvuO+5ru7edx+0a9kbDgfvs9Ov/vCYHxgCAWBCQRQA0CSdmVCseddBi+ww9o/tq3WKvnLd7Y+/sFyjFRGE0qEQiVRzfeKuH1wU8xwAjIyAX//piQ997sZXl7ayDTWWaobGKm5DSAy0584zjj1sDy5FKtBanjm15bjDd3/oqde7MwWHpHqcCEIIGuHVZRtXt2488d37RHd8GystQrp1ucJHly57kG3YFZQqBCTUzDErVgLkMJWI7Y10zfzZezU3WB5WOJFG9PSyQMiSD2RLr2nP22Ud/kub8kETzWgOQgw2l9xzWIBYsa96tWQoCgAJocaJ2v3htFkfmNJiReQfwh5MBJahMe1c85FpJy3yUKnIizOwirZvkYlk8g+34UMruhDB8ujXirVSZAMjKcxgZiLcsLnzpPOuue6n9+eLvhKDAMxg2DID82iWr4hEnzVsLTMCKLGWzQ23/u2k86/dsLmTCHkrVxoh3YbNnSd+/Nrb/vg0IhNYZjHM1YPBUUn18CxHvjZQEm5o6zrj8zd9+yd/UkTG2iFNjZEDa3+I7adDSeUHZrCWo6sjYAX2lt88dt6XbokUW8vc0lT3jQs/wEAIKAKVm2JYUILv/eK+pcvXR4rP6H21Ilqp515d/uPfPkJgDYv0XS8gIANddemHmxpSljmKON3yy/vPv+xnmWxOiQGAAXdnTFWIKnVJkbF253nT7vvZF3ddMDUUpbDf5scMobVKzK/vef5jl94cPQtbmxnDrBCX9GTPWrr6cQaTNZaAHQRCQB0i5ykIUafSzYc4zncXzptfl7IyXKKNEUANM/ih+KGEzF1521U06zLBpqJtHM+NXnGzSBeoHHAepAAYkW7avtnRAIoUToylvjV55smTxxlh9Q/sYa0ILMvUcd53zpmx/yxHQCGU8Q4H0geIADB2dNkbn9tYcgKOVkKAApdsyGHrdNTemTnx49c8+dIKDQEiGOZqQNGkNClFpNQ2DyofiiofqQYXwxYAtIRPvbTi+HOvbuvoGRLvokK3rp7sKRdc+9ziVRpCZrHM1WpR9OUiIIAjPIAINPVzcImIYSZkQvvV7/3xh7f/TStVfcbt3Ovy9Y76qF6YEf46YO64/6Wf/vahyKa2zGecfOgBu8200G/oIoKAhvFL1/4q2rdGb8CyiMgl37ytAsJVi5ks0rv2n/+hEw+O4jBK0VMvvnXpNb8msIRiqs4bzQYRVB/bWTlbW06KFJHIwIuK7s6UiU1//vEX9lo4zaLWg1Raw1ZDeNf9L5198c3Riho8OVZEEz3b2fWht1c+aTjMGGUUkJQCMgIkChCb0+n3ee73Fs6fGI/zSLz8w3esgBUOmf2QQ5aC4S35sItNrBmnpoOscBeoXMlPZwMQA8gly1ADKAClQBqS6U8mGk+fOtGwaPxHN4RQhMbKzImxy06dXJcQBIp7iCjAQ/pHBToKT3TI0xt6EYFHuz0WgQvD/my0c/uBOevC7y5bs0WDCS0PWOUCaFFZVAyKhVjUVg8oH6IqH5FSxKPvjKFlJWb52vazL77JWB6s9bAwIn7q8h8vWVkaUv9ZJQGIvjzmqaaG5IiOZMJl0BYVixrg0WcGZiYwl1z9qyeeX6qIhhlSZKHoekd9iMAg8LUowX/f8LtNW7ojWEfEb335LMch6G8UW2ZC8+AzS37/12e0HgFGD1DrlKKf3/nIS0taCbj6wiOva9xR1192dpRqioDG8uev+IUAgkj1CYlKs8Gg+x1CVqjyb9WyGbyiym8AFRhhUH4xHOrhIsvc3Jj+448v3X+3WUPiXWhZQ3j3gy9/+DM3WMuI2BdvEYms1wc2dZzx1obFRTHFgiAYbVlJmc2IUamJ6eZzY/qaBTNSjmaREYHICKKxxkLIELJ0F7izaNd0mk0QpqaAds0m0VmwDGhAmb5Kfiz7ewkZdDJ2uKUvzJsmAP8sfjetkAWO26fxzAO7b3ksGxSDPvNSqo7Ij0fYU9A/fGnjgZPrRqXrIwAEVvLC1TkE21niRFf96O6/v7x6MKwgIqMe1xA79rA93nXQorjnakdV9MEhzeGKMyoMTVtHz5/+9sLjz7/BoIj6bauG2VHm7y+uuOFn91x83kmWubJbRn7oP/3t+T8/uliDHYh0iiyodNI97dj9jzpkt0Xzp01oaRhRRkVvJr/4rbWL32r91R/+/vbaLQBBFPSsbLHCllF/+qs/eerOK2Oes+05JAIW9dmzj9l70WyJgHhQhlf0DRWjtfLX6PUgNI889fofHnwhk/cRbWUkzKIJe3Pmtrsfu+T8kwHEMu+x88xPnnHUd299kDCwMuDS5LLrf/vug3dPJ2M8QucdsxBiW0fP5df/DsEM2GgJgUF9/tzj5syYGIEgET7z4rI33t5AYKuHQQQMzrGHLvrgCQfVpxMVtb3sNSvlr1RnL1UrNyJSibFEmTpEyCJzp0+I0G0w3jFLY33qDz+65IOf+s7jLy7XFJr+WB9adlR4799fP/2z3/31jZ+r3CBBVAB3bWy7ZG37aj8ktqDIKgYQ4GgEQkpNiLsX1yU+M3NKKVw7QpNruNFY33AhlC1Z09oZrOz0X95UuHd5z9oGnja/ICpoB/AhVKAMaAYoZ7JFnn9CEa1oAXm/XzRnXir+TpNlbm/PBEJYsaHw3quWv91mCS1HsZPI1NZlyncN5IK4OH0SPf6R+dMb4iMOp4oQ4hdeW/1CNvvQQYsq9uA2ljgitG7s2PvEL/hBWK1hIQIACcBnz37vZz92XJQyMjp5bemaq3/whz8//AqBHWCKImI87r76l+smjKuPcixKqp+xB73/K2+taiOw1SqGImLUxx6y6Novnzlr6vgdvC9+EN502wNf++4dLDygRkSTsqi//98f+ej7j4jAN4rGfulbt3//toeU9D1RRMCg7/nJpUfsv/OODGbZqg2nffqGlWs3I/RNklIkoPfddcZDv/qf6GYxS77g7/8fX2rd1I3Q77lWhIzuJz50+Le+fFY05pH4eVkp+tilN9351xdJjO1vk7LgTrMn/f1333AcRYiWWSv1letuv/G2h4iNKec5KUUs6vwPHfntr5z1D32+okBW0X//J77995dWaAjDQfq4o8iAc8IRu9309XPr6xKAqBB/sGrDNV2Zdb05FhHCkguMQDEAiXgwA51vTZv0viktLNX1BCPx3Q8vKiSFQHoLNlu0maLNhtyWDzvRppuYdNgBXASxoAMgrnBtggZgFFCsCCCdjH1yfOO8VNz+U5GutDEKzJkcP+fIJuU6WOEIQOgXskAQBGWhF5OPr+sdRUgr2hIz1hpgY7dfTRWFa2+67b5iWMqlrNqiSYB+eOV5V1784fHN9cba6IjcSdFReTF6fchfreXddppx+3c/+6kzj2JQA+xZAswX5Rd3PYqIUfZm5A966KnFb61sQw6rkY4QGNWpR+91x80Xzpo6PjTGWFvKsh1hnCAanuc6F557/K3XfXJw3ZiAIPBPf/dQJfdl2ypjLl801vphWD0Jwz/8wMyfNfl7/3229L9hzMxslq/d1NGVqQwjnYpfdenpkfkycE8F85PfPfra0jU6CoiNJAL71Itv3XnfcwOQDjEKb8IN//2xmOeUQ9gEAM+9skKYBfscu9ZKMqEu+/Sp0XZVvVRGcVTPz7ajLpH+mIh5d91y0WH7zTPgaFKDoxAazT2Pvf70K8uibPnrV6y7ckthQ1eBA5GIihwrCWHIrjNXqZ/Nmfy+KS22HHmHdwjsWMCwWIHASjbgtly4pjfIxm2szvSCLYCU3XOq7xACcAUUWCHtzS+GZ0yfGGXZ/NMlesaO37OxSYcWCakqP0vKs0IgBKIgZ8wjG3sqms5IQ1aBiGEJ7faHpIh6Mvnf3fMMiGHo56dj0J8/+9gzTj40CI2IaKWioy8EQVR5MXp9yF+VImvZMl/9hTPee9giBlWdwiYoKPaOvzwVhEZRX23db/78JBIRqmr7SFDPnzH+x1d/QgSsZUdrrcq1SSMMxkbDE5EgNKe8Z7/zP/huQYf6e8GEzctvrln81hpC2l6IExGh+vJHeriOYpb995g3fVIDV3k4RQCEO7qybR090a9RatvJR+/3nkN2ZtQDNg8QMVYuveo2ZhlmpCKKbwSh+cxXfzpYeyFERnXGyQcevPeCStJyNE8FP6guEUEUQJo8vimVjEdqJuEOHdXzs90HIcK7eMz7/c0XnXL0nhaVrlpmRABAhvGm/znz+CP2EpYr3m69tqu4pavXWivRl1sABNSgDGDC3ctTt8+bfUTLuMivN2plaVhgF1oxLIYlF3JvYNd3h2t6/VizkrifEeCSEahKsQhRYCP+dIUGEbAu7p4/YWKdVoBI/wIMloSACLtMjx84O4GOh9I/no4AKsqnAgYOC8Vn2/JdQYgwgjBFRS8LLAcCxe1R2kUP8IuLV2zpziH0bZ6IaAUmNMUv+cTJ1rKjdzSCrRRFD8WVl5zuOlidW2cti9hlqzatat2MWDKmikH40uJVbA33NXADBAKkz51znOvoSBMZg3QGxChX49JPnJxOONzf0aYQgZwnXlgaBUyG4y3dkZEgglIUc93tZgwhoIhcdekZMYcGpFJaZgLz5Murbv/T34cZTbbMRPi9X9y7bE0HST+nAREKYnN97MpLzmAuKQ2Rn5FZCkU/yt4ZFEZHRKRR7UJby0kcXrIXMovnOrd9+9Onn3CAxZJ+RwTM5DjOj678+FmnHp4PzYVL1ny3I+hoywRGuKILRe5/H3QycUhM/XbBzL0b63a8HSANUw9CLOXZBRayRZsVwTgXyYRSpdCJBkNRx0MwEQGAWMKJxezJk8b96zRhQETLQArfvXvaUYREWx0ZIhrbDu6yniJs1xAdpNgZI4VQDItvt4OS0Z8fe/ZNIk1VN0UhIenTjjuoLhUfUVrytvGOWebNnHTkATsD6uqNmggBaemKDdGDBwDrN3as3bgFqlJNENGKpBL6mMP2HBDb3dFNiFBAxjfXv+eQXQG1qorXCwAAv7ZkbQVftqtUR+s28qwP84je7wcGEdeu37JybRv2v3AA9FyVqKLkIULLPH/W5M+efaygq/rnGAgAgrns27/Z0tGLgNvWSZlFEa1a13btLX9ECQe8l4AE1BUXfai5IS3Qr+gKEUgNsu0QCCFSqYLQdHZnu3tzvdl8bybfm8n3ZvM9mX5H358y+d5MPpsv5gp+dBT8YBSltUTIzMxyy5XnffTkgyxqVysWlUrFbv/uZz580iHdef8Ti1f/NG+7u3osSV+GPwEoUAJeInWMxtvnz5yTSloZg0LS4URjUZFoIk3sKNQISqMFIc0BWAG3b4AROXBYSnhGASJMu8kP1blNnuZ/trduELzgwbukvT9uyhoZ6lEpxSsIydfO25n8AePTAiND7KIvPosBDHi70IgAsGlL18DNGQREDttv57GtLWcRFDj6kN3uf2IJVhUhoQCgem3JmpOP3jfCk95swTJgVcCOCFlowYyJ45vrmIXGNIMoCgLutnDmXQ+83J9EH0Bg9fq2sutq+yp2FBMY6aQhoudqAPj6jXcZAUVYCXAiioCaMXn85AmNIn3ewygKedF5J91x37MrW7cQQQUfmUURd/T437jxzu999RxreRvrR0AI6aIrbi2ETP3NCEVkgQ7da/aZpxw2uJ4EcZDHkAHArl7XtveJl7JAGAbZnK8o8u8BYilXrnqtIZUq/EQYkRAFBQFAaSWofvD1c444YJeRFvwSUeSX/f7Xz00m3Zt//XhLU+y33//sfrvN7SgUP/Hm6r+G5GdyJl5unsWlRagEEvV1J3hw004zGjyHx6gflh7G7QdEZLGIQAiEaK1gEjEmRhRg2VvHCFErnEoLCAsMUl/wT5w/UeBfS6KVOm9SfFqTfrNd0AYCBNXBCgcAQQhAg2/kjd4CjDzUnQ/ZAhtruwtmer2zzfEAAKxa1wZVujwiWhZXy4LZkzFinNimXlCi9sDBqA6D2E0EkZoa0gBDKBuRMhOh25r1WwCJkPslNQB6MfedUboBEefOmABiR+nfFYme6TXrt7iuAyKhsZWUi2hySvnPA1I6CLWize29L72+4rd/efKpl1ehmGqFhlAB6d0XznC0spaVwqrbZOMx9xsXfvCMz99MqKpNfsuilLn1938/+7Qj99pl1taoDaLX77z36b89uWRwoBwQ44763tc+Ht1QHJ772A/sW6s3lxXjUT+CAuQEoRm1FRUtzmu+8JHpk1oO3GfBXjvP2pwvfGL56vsJwmzOkpQUOgTQgBYUQF1D3Udi6ps7TUvosVSShpVnpwiinBulUBOEocRSGHgIUnHSAYQAAYDf17cQGUR5U4gXNCYQRtbJppJKK1Jt5w3ra3A4qCQCiHVxNbvZfbPLIocyyG0X+Q4EwPjcmvVHMbl5w4jsMOcNb8ctjWis3bC5M7K9qi8mFnMiCpBtX9N2SeWqQ5nREkwmYgNPN0gyucJAF5gAADSk4u8I2AECwJSJzSI82ENqhtPNA9FYAwAvv7Hqgst+asIAQKzh/rR3MmgtAACQUn4QovJELIEZsA+IiIj96PuOGOzP0EpZyycdtc/xR+76l0cWKzVgbxAW+dK1v7r/1suGvEXMjIi92cJXrvsNIg/Q7hWiBf35jx83d8ZEa2UkHlKhCHYRRLCKOWJozRix32yUIZ4YeUesisjpJyKfOutYAHirN/OZFeufKmBQyFtV1QVQAEmUoqaGunMT+ooF04iId6x+aVRgh+gqDCw4hAoxnlCuhhARRAMrsADFMtKFfbooMjgN7v4pHSM1fOdiNNd9V4gwQmdZhFHbcUYiYpQ3N2mcq1YFYAlESvFk6J+AAmKt7QoBQKJCyOFcR3R3u4ucEJ6kOWDZ7geZpeiHQ6a4bJc1FxFfX9a6ub037qkBlbwIKADjGlML504dYIYgbn/DLz20g94VaXZlruAxFtfR21ATtruColDyKe/Zj1nOuvhmgIgkZhiftQYAlBhBGVCMq4ks6sP2nnvEAbvwUJ7KyNK/6pIzHn7yS8Wg9Hj3aW0ET7204rf3PPnBEw4ebAxGGezf+N4dG9ozJFytTipFVmjBrJbPn3NiFL4YOhqGW1tUA9zC1QrEEI/eEG8gZhkLrioRjfhqR+/HV617rQi2t2hV+XEr7XJCqMY1Ji9OeRfNmwpRhsqYekn0sOEZtEKHkAhiMVSOsCLwNRgoRSTCqi6uAmABFbpAe9YlRmKCiLHyyLK1q9G6cccBcVABQAhRHCTiUAFGtCBAkSNJCFEhESIhOaDmxbw9GtNcRVW3tXMBYlNaExlG6Sv6oP4qHgBbzon4zB6p4T/aItiZDxOhbSIOGYKQPXc0dy4Kpm0nuCGSyeY/dunNXZlAbIBIA/BJEf7om+d94PiDjLWVtPWu7iyiQik7S6pnpr+9P5DIXqBYDOAdoCCP0LOnNw/9/IR9T/5wrK7obX4Qnnrs/sz88S/9yFoggqhEabvzbQbxD2oiA1iXcG/4n49tDSmiSMWsaeMvveDkr33/jwpCI/05+4Avv/43xx62ZzoVr66piHxwS5av/+kdjxJYHtCBQBABbrjsozHPidIetzJvPOTeQCWS4tHfJiLkHY4NlIpeO3rOW7L+zRyDCSz1q0bHkNHRE+KxbzSmzpk5iUU6ujItTXVjRQs4ArBDBFdTyKIVKERGYQWWoS/wWv1DBHYGGNnNh5Nj3oimW2s8aO6UTa0b78oX2imgogXl5oENCAJZoADEB/FFfGArxKCo9MQjCGihRuv/z8Tmj0ybzNvRCREAkrHIgKl6K1UlNGIpzhzlOY7suWXOWAw29UCxy5++KFKRthFnUIqSiThAtp+VIVL0g7b2nnQyvjXdkBCZ5cC9Fjx91zc+9JkbXlna6ioJjenzNwNZC+d88Ucb27o/+7HjrGVmAQWFYoBIg1yBUq1YpVPxobQ/6ezJvTNhIxGRxW+tQSISqHZ+DYGt2wxTaK2Mte8/7kDPc86+5GY/MDSMGucqrieJJscwW9QTGlK/vemz82ZO2oYLKapn+MzZ7739T0+8vaZNUV/5BbNogo3tuW/ceOd1XznLWKb+J73wyltDIzSg4B/Roj7rlP0P2XfhSMswounhKDtyB7DKigCpILQ78g0K8dEtnecv27g8Z7EYiotQMWAJCIRcPSnufGdK0/umjReAT3zlhw89+eZ9P//i/NmTQ2Mcrf9xYAcAhIIAmtDRyAKBFRMK+FE+HUChyoy1JZ+dCDq94fjI3hleHDNaZynXOWvO9D27M99csfo1LnTkOhV4IVARBAAsYJllAPowqexvRsAutJd0dG0K5ZLZU7Zr0mpNJWirruilMsMdln4lNZpUoxCxmMmH3T0Wt1VqFpFrK6K5MyaubO1ALKlaUWJHYGHxW2tnT5/AwgRqq2qF5SkTmu75yRdO+/QNT7+yQgFVedcZEQjksu/cuW5T57e+dGaEKX9+6EXpn/zFwCK8166zK2rUnOkTRLjaXy7CAtjW3l30Q8/VY91yARFx2eqNVS3g+oywyeMbYRglxhW80EoZY0989z6//8FFp3/uxp5MQRFvk7CriuMeCEEBolL2pKP3uvKiD02fPG7bikZku3qu860vf+SUC749YIO3woTw09898tH3H7HrgunVdJu3//HvT7z4tgKurjgjAkac0Jy44qIzmEeW4oOIAtjckLzh8rOJaO2G9p5MPoJxtkxEWqtq/3gl+MZSKoMzxkYRZ6WUZVk4Z8ooNEQRYQFF+If1bRev3bIqE5KxNoYVZxcwKAe8mDPFUTfOmnDMhHGZfPG8L/7gL48uBrHHnv3NX333vw7cc35UHfiPAzuFqBUyQxhKYEQ8kaDM4hT099nZ0qphJAptk6tg5H4dFtm1IX3jLguuXr7qHq+wJZtjy4IYAgGQAWGwAA4CCIQlTEKKdH4VqI7u4FosdixZ/fX501yltrIbCwB25Y0oqU7w6YM8XWFsATuwh8Gw1OFxLiQnN3lTEsSiNW3D7rPMWtGUCU2A1C8XBBAA//78klPes992bpAia7m+LvmHH1502qdvePz5ZZqM6WOVAABQYG/5zaPZbP4HV54PAMcdsedDT71pMUr1BERkBteF0spGAID6VMJzlB9wxapkBiJeua7jtaVr9tl1jogoNTZgJyKEGBr7wGOvCIeM3E8JR9pr0ex+G+cwQDbS7w7ff5d7f/bFk87/Vmd3TpOYrRDlJ2JOvhggIqJMGFc/Z8akdx24y3FH7rlo/nTYOkd8f3cBWeZ3H7Trf7xn77v/9nI1tpZqKgAuuep///qLywCBWRCwszt7+bd/A8Lc33hAIBa6+pLTG+uT1m6LSkCkX/wBSlkyNKGl4T+O2X8M9e4RFRFJ2Rd569qNl23s3pgJoWisR2SALYAGRCAB5Xq7uHLd7MmHtTRu2NJ95ue+9/zi1UqMgLR1Zk4577pfXPef7z1iz1EotkOMf9iaXclwF4bQCoOUjNYK0oXlXyvOOx/YjtKBHTEYj4u5Vy2cf16quSmR9FEKYgIIghLJe2X8CkCDaGACRhFgBA6ku7P3Z8XwE2+s6vRDquav6K9FbuoJmQQI+1W7UfmLnTLe0cg7jSGmNQapZLapToNsr8hJAGD3nWcOsM2sMLD93T3PbOnoJdwOx1GULZyIx+6+5eJTjtqrkrbe5w9lqzj45Z+fPf2z381kC+effvTPrrnAdXQUp0UUUnqXedOmT26JVAkRmTqpee7MSUi6OoKJgIj0/f+9L6LBGCt6yNBYIvzRr/+2dnOvwmrnOlgRYHPQ3gui+OBwzNjqUKmxdveFM//68y9Nn9xsgQa7vYkASL/v2APeeuh7r9533Sv3Xv/Cn6756y++fOkFJy+aPz1KOR5mGDTKeb7iwg+lEs4ARl7LTGKffGnF7/7ylCIKjSHC//nOb9u6CwRcvUIUEaM6dJ957z/uwO2CrAzgderTUnlwofTojpHeYikxbuBNq9ZdvjG3sduXnBUkAGAF4AIikIF4PH5kQt2+cNZhLY0rW9uO+9iVz7+2WokxzJaFwOYKhQ/91/d+9ruHtVKWd3Sl0fAfXULQERMGCgFA1Hy6knFSBPDLRxGkiFCUoAAZf3uus62PTAAchRfNnva1cRPHewlQCiUKL6ICF0sdfCiqji65ABgYgBFsIF3tmd8V7VlLVq3OFdQgvCMEEdjYG7LYUs2bKte8VQOfFuVRg0teqVx0BNPtKswKbLDsaXIc2ia4EwC868BFnu7nVxIRIunOFS+95pdESIRRx66t3fWoTMd19G3Xf/rc0w61qAfsh4ZZSfjnR1475YLr2jp6Tjv+wN/ffFFDOsWgHKUF6P3vPZAIIw67qBTsXQfuAqiqLWjLjBDe/beX7vjLU45W0eM0KhaAiBZYom9wHf3i4pXf+P7dKP14jZQiQDVnRsuuC6ZXZ/MO3xUV4d3CuVP/8tMv7LbTFAsD2daYgcD+6k9P3fDze2dPmzB72vj6dIJZouuKZn4EHn2R6VNaLjr3+AFFvgAgwCBy2bd/3ZPJO1q/sHjFrXc/Tv3JsCPGOs+h71x+9g56CQhxcOn0KA4cYd4YACiE61a0XrGhuLEjK74VxFIFvwBaUAxeffKIOrx10cy5dclnXnn7hHOvWb5mi4I+c4QFiETEfPYbt137wz8qwh1sgDuCnJ0Kwb8FFEAwZYwrllrD9v1cBCkCFsT6TlfewGhZ8LGcVn361Ik/mD59ZyemvXolDoC2wAIMgqVkZltOZjYlLx0KiIFiT/ZvgT39tVWvtGeq8S76rycfruzwgU2UL1iyWzWAUz4UoEM6riY6TsnuHWYCDQAAJB3lo3QwxDRG9XbbekKYZ00bf8QBOyM51Tu5tUxi7/zrCxd/89aiH2pFFVKQARVR1rK1LCLGWmP5hsvPvuTjx1oYuFgjvHvutZUnnHv16nVthx+wy90/vLCpMR0w1Sed008+RKSUvRFB8AdOOEg45IERW0Sx53/5x7/8w98r9eGjEyKMnsY/P/TiSeddk80VQfpRlqIgoDrzlMOcAVyYW1lUQ96jKBVu5tTxf/35Vw7bb75FZxDeCYi95TePnnL+tR1dGQBg4eHUvW8tZPTJjxw7e2oj92d+i3jeN7bnr7zpLiK85Kr/FcEBlFYKiUFdeM5xC2ZP3lq6yRCrbdCrfjGMjN9R70MVZpoBdXXbQjoAQhSWry5b+80txS1dGYsMiOIAOEAhqACUhVh96ph6+NlusyfEYwLQuqG9dWOnQhmgkTCDCBDab9z0x4uuvDWailGT3Q+/4Q4ySK8v67uCV9sL62O+HwD0Avhlzc4vm7G2VD6hLDlx74SdEvNa4sPO+h4C7xDAisxPJQ9Kpl/s6N0UAwgsIklU4mCrSDe5xJcQsa4IAmiEjNls6JHOnj2T3oxkLOKYivgRl2ws/OSZrryxoLGkx0V2qwfglVBPxdBrip3U6B7a0jDMJLtSNB3BhHLnlo4Oaz86afz45HaIJyMNYmJL46/++MSAaiERUSQvvL72zw+/6DqqqSGVTHjl6m6oRo3yUcpWOXz/XRyFjz73NmE18TywiEZo68rf98jLRx2yaLedZhxz6K4PP/PGJeedcNh+O3NZe0JEFpk8vvH5V95eub5L4QA7QizLPY++8tRLS6Mqq/q65EgbQjDL2g3tjz7z5uXf/s3VP/yTH4Qo/dZyVADfVB//4RXnxzwnuuZohA89ufi511YR9KUfI4IAfeC4A+fOmCiDHLVRGCcWc9937P6vvLFi+bpOh6TfPANo4BXrOu995MXD9995fHO9sTwKsIuK8z1Xz50+4bd/eZaw32YfUXu+ubx13cbOex5+GYEHqLGMasGs8T+95pNIuO3muZW+sbfd/ejm9kzlRCJAKF2Z4rRJzbsvnLHjPADD5AWInOOB5S+9teYHnTa7JSMooEGirAYLaIBciE9Mn+rQjxbNanLdqPBn0fxpO82e+KcHX45MmcG7mEJ44Y3WZSvXn/CuvbUiO6r7MoKYriLUBFTqfgtoQcIqS9b0tdgp3QkLhlVbNihtwjugjUdK2e4N6bsWzf3c8tX3pXUxWwRDXA1zlaITKOc2I0gIAhBycQk7H13aegOb4yc02/Iz+8b6XOAktd9rKrkmVNbsFIACJAACT+OsRGL4MeWKpGIUJw0cpvT2fauRx+2w/RaecOTu9zz6uqOkmvUwSkxd8vb6z3ztfxMxbK5PT2ypTyfjAOBoTUQI4sXcSIsQAAQ6/8PvOnCvBZecf5LrqMuuvxMAqgmKDbMiWbWh/bhzrv7ldz5zwB7zHv3l5el0fDBvOyB+7cIPPvLBr0V7dlVPbkAEEPPYs2899twyV8n4pvQobm5ndzYfRJF0HqytKUQD+psXf7ipITWcEAHgtsyIaJJjnnPHzRd+/Iu33PnXFzTZ6niFYdZk3lq9+dizr779hk8ftPeC0bnGo0jr0Yfu/r5j9r7rgZcGnEWYczn/Z3c8hjCUH0rkhsvOjhhlhtHfkpWiaZPGvbZsY78cYkER+5+X/eSWXz0wsaUhXwxESrNX1YWnUpgkVGLGA2bAqlJZRFBIrqOjTVSATnjXHmecfOjgwHSEdFkTfvat1XflMNfVawmQQYJS9A8ZyIF0U/oDmr69aEbS0aVaAwTLfOqxB2itP3Lh9y0LkfTX4MVYq0nuuv/Fnp7v3Hr9p+pS8VGk4I0gqVgBaAKtQDGKQQyln7cuKEMelFvYAIQ5eWN9fky81wqRASYnYv+78/yLl636bb3X3ZEREbH9GdW5nPtSpVcDEvlmZcifWdG2uRCeM3OiJWGAo3Zu3O+VzsfaUjqftREFH5V1Og0RxQHHJeUVFzVOGKHfUQAwHqOYg7pIMReHrxHc+LWPL/nI11esadfUj/3WMhMBiuTykst3rd3UjYOILvpoDBD//PAL/3vdp447cq/Pfuz4lua6T17+M2OguqOOZVHEm7b0nHzet3581fknHbWPsXbAvh2FF3fbacYVF572pevvjEKZVan2kXfGgoAfSOvmnlFFYTmi6R8cRHIUGXRPPWr3M04+dAikG3r7xG0HzolQBAjx59d+sj79i5/e8bhWYKtaGhlmRdDe1XP8OVdff9lZHzvtyCgTe8ScAoAicuUlpz/wxOJszgxIko5aRw7Ig4m4Cz98wn6H7LvTcEEWAQBOPXb/ex5djP3KJKKf+dW31r321vrh1cZifwQcIu6LTmxcY+KMkw8d2KgEgBA7iv4n3lh9n0V/U0YEhEB0OXIuoAgaxtWfk1DfXDhdKZKqXjmKyFg+6ah9fvmdT5eSImkgB6Bh1hQ++Mybx5595a++85lZ0yaMdB8aWd9Y38KmnuCVtuJK8m0I3FVlw4ZlfUoqqXZiLXo6PH2/cVrRjul2pem3Iq6iY5sb873ZN1kViiFwiX8KDSBWqXiVAwEYhBFEcmJeZvAK/n5NdSKQjqtj5tWv2NS7MnQkDMUFiJeSTkiDaEAlkHbmpfi/Zkz2FA2/YgDLvV3/sL5zSxieP2NiTG//41E6cTLhHXXQrn9+8IXefOhQf7ux1Bmg1AE2CqH269FZMt+ZgAPDdz/wwsK5k3eaM2XXBTMWzZ9676MvB4YVVWWTiRBJEJq7H3hhzvTxuy6YERozYMMkRGv5gD3nZzLZZxavQWBCGmCX9Y0KZaRH1PN0UFk+EJFF9/jDdvnFdZ8GgcgW61MiCB96amtm7AHzZk6SrWf/VopA33vEnmEYPPnSCkLpX1BVUi7u+/tiR9Gh+y6M9qER4V1kbtenE3HP/dtTS6N24kPmA/aNiqixLvG7my6MxzwaHvdj9JY5Mybd/den2nuKGnFQzwqmUo70DhwgCOJoAoFD953/7oN2jfrGVmLlCrEt55/98uoHffC7cpYg6gEcxRPJggJsGFf3qTrnioUzSNFgE4kIQ2MWzp26325z/vTgi0FoCQfufpH7ZVNH5g8PPH/4/jtPGt9orB1+f48RgB0AhFY6c/xaW2E5FxnBdgIUq8xYW84DLRX3IhVtAfA9i1IT6twxyT6lqKaV8MjmBi/rvxJAjkMIBCwOQa1e7b4lAEQWyYTh8xbymdxh4+oEMB1Xx+9Uv7qzZ7m4NgjZKZmxGPE7ueSMjx3T4L5/UstI2Rei4dy7qavDhOdOn+AqHI5uGHUdHtdUd9JRez/z0rL17Vlhq4mgf2PsrfVL5VIHPuHS4yp3PfB8fSq+3+5z58+efOh+O/3hgRf8wPTHuxLnyh8efGliS90+u86xlgcQo0e1UEcfsnvMVY88s1QAFQ5RoT1Uq+ztHwMuXxERYsQI++kzj7rp6x9Xiga4irYDdu/dDthVghgscuQBixrSsb89uQSBB/T6QRRCfPS5ZWvWbT7msN21ViN1FREii+y9aPbfHn953ZYewm1VcCiFAvq7l31k/z3msQz3RBEKu47eZd602//0JIvo/kUxo+6rO1gQ0ALuv/ucarCLkG51Pn/uklVP5NHP5y1G7vKS2oEsyqGGlvRF9e5lC2dE/X2GvDWRfjdn+oSD9pp39/3Ph4aVwkG97kShZPLBnfc+s+fOM+fMmGjMcPFuZGCHiF15s7zdfzMshg7YDoEs9pXE2pLRCAwYMRVZNNqb2sSHzKvfdhvwkYyhlMVzwLh0ix++XORetOizRD4fW5XRWLFqo1QSBrAIgRSNeS2htnT2HNFYp4kcTScsaMhmM6/6jikEEBeIo7iALpCL9RPdT7SkdqurG003I4AHt3S3+cG50ydGltpwPh/50RvrU6effLAiWPx2ayEAAQRhRaSq4xDbPCBKGEG8/8k3hO1h++08dWLzkQfsfM/Dr2SLgarybUVObUK57/HXFcGh+y4c1JOrVAt18N4Ljth/4bKVG1s3dwOQABMB4QhGtbUjSuUVIEAlQLvvNPWmr55zwRlHIw4RYI3A7pGnX3/utZUEVsp5AkQIqE47bv/tgh2UaODAMu+/x7zJLXX3PvaqCA7wjouIRnht2canXlz6rgN3qU8nRqRKQJm9fdeFM277/eMU6bFDiSZi0IfuM+/qL5w5LNfkoHyjmVNbFs2b8uCTrxeNCNvKUkHcUU52Kse+tFaA6qA95x554KII7FhEIb7WnTl36dqnfAmLRUtARlAQWJRB0IIejm+uv2Rc/NJ507i00rbRHw6N5ZlTWw7ee/6fH3qp4IeqHCuriAAohEIQ3nHvsy1NqX12mxNZvNuFl5GBnSL0Q9nYbV7K5vw4hu0MvdhXDysRPwrEHfS0colclyA0eRuesHtTwlMAMCaVRVESDAvs2Zyaq/H5nlw3IxZZbL+Eu74jOqktcYEJQpgP3nCcJZu6j2xKx7UChPfMaeRCbnGIvraALB6iFonTXC/8nznTU1qPFKojTfbh9p4233xs+vhSxeVIlq+j1aH7Ljz9pEOa65M9vdktnb0MSpAEo38rB/b/te9gIBZEwCdfa122Ys3Rh+w2Y0rLcUfs/sBjr3RmfFdRlOhQRhzQih555q1NWzqPO3KviLejn36HaC3PmNJy1qmHLZo/rVDwu3qz+aIVoKFGNaIjYmLAieMa3nXgzpd96j++ecmH58+eHJXuD574COweePyV519fa20IWDKZRABQve+YfefPmizD0MQjynJj7V6LZu+588y//f31gm8chViilijRXbqOrGztuOfhFw/ee/7k8U0jslEiVX3KxKa29u4X31wHbIakKGEB11G/+d7nxjWlR9PwBNFaXjh36slH79PR2bO6tS3k8twCCtAoj9I3RF+C1gqQs/cu0486eDcWASRCfLSj+5wlrW9mICwUrSYwIIjiAUQKZlJNb/CuGFf3yVmTueTr2H4LC2PtjCktRx2y6C+PvJzNhwJcVbyJAFFtjbDI/U+8aU14+P67DAfscKQZcO1Z8/DSzPUr2l5P+cUlxq4oB2EZ0ErK1WkPSSEbtL5NNygIwXfMN0+bfObB40fajXC7EqnQj23o/uRbG97KW8iFjGWmQuk/P9GLDoAGFAAHlIAzLnmMlpsXzJoU90Jmh+jHr2/872WZtnwOhDGOsQmpjzbRTbvMHQX/fVST++Wlq5/tzDx00K6jiEhH1mjFg/bm2+vWbep87tW3N7Z1VXu72bKVkgkWGpZyeWM5Q4odR9cn47vvMvNDJxzseY4iWruh/f2fun7Jyi3AZuCYhFEnjjpg9o+vuqCxPoWDtaoqXrwtnb1LV6xfvW7LK2+uKvohIo6iB5uINNYnd9tpxrRJzTvPm1afTvQFoLei4ESe6W/ceMdP7ng84aApcXMyEQYGfnrVBe8+eNcRReui6stXl6x+/6e+s6k9B2IHTwuQI2xu/O+zzvyPw7QawXKIDMmunuyRH/5q68YOramsiZQingTA6HzuY+/5yqfetyM8H5UZW9Xa9sLrK598fknB97u7c6bkbaw4enCoJD0s02mUCOiiDCYAKBT8QhBEeZe+4TNOPOicD7wrmrE32rZ8bkXrGwWNbHwSCgEtioB1RTGgwXEN3jdmjj91SkuU8jX85R/d4jffbj370ls2t3cNGWJHAELK5v2z33/4FRd92NHbSYoc8eo0LG+sL177zOY/Y0+xzYQvl43HEJC5Pu7UJ8jVyAYVQiyGcVdb5gkt9pefXFDv6R3thjIE3oFCeLM7e+5La18sAvcWWYFUssqccslxhcKkXOePCkhJrC6xL+NPdpo2pz4ZMLtEty9vu3hJ26ZiSIonT4v/Zs7kg5oaeCTp19Vgd/nSta9lMn/cdxcBGd2li4DlMSgMHPBItHf23vvYq4VCMTTGD0yhGPhBWPRDtswim9szh+234PwPHz3AeVcdGh7Efjw2ElEu0zD6vAShCY0dVKIgnuOMogdQ9HStWb/l+/97fzabFwDLbK1EhIZhaADAWrAinzj9qHcftCuMpFY0UgbbO3s7unOOLpnKVG5+EvHRzZo2fsf92lGsnd75JvTRem7LZItKBQYinm9hiRSakmMBIKVoUiLGADjySyu15WYu+mYbEXZCzOQKzQ3p7d50HEVtw7qu4Lcvdv1o8+bOEDqeDiWPqAUDiGtqSOh0XKU9QgFXEylRhA7SpoJ/6p7J//nAzOG1/hyNfreqO3/B661PZiTozBsHSv07KvXRqo/CpJRvowAUOApcx9ud8Ae7TNutIR3h3YNrOz+1bGNbo3ME5e/aY/eIzWKktyoa1dffXLskm/v1fgvHCgWG4suUAX73/q+VoyXYl8s/Vnch0j1hDFg8JSoxqQ65/uNl+NMyClQaa3qYYS6VqlLiUd3fsr9s0AIb4a7/Tt+RsQ9QVNICRKBgYVkml+0FKCAAiYBLmHBV3MG4xnRCOQ6REDMYFs+qxetyC6Z7s1riLDC2Nz0K0TbFnWOa0m9v7F3rurYYiACocoyimqiuQugUhVIQWOx6D57o7tjdjc1MJnzm+Q2JA+tjG3OZ/5zSMieZklGx4AsAIT69JdPrhydPHYPmaiVPM9Eg936V9PcoDwgBDDAeLTOXA7gDjpIPYDg+r62OakQHRWMe0bMkIykXG35kM+pYwf0nR6Avpkmj6i4Yzfk2otJjCIVVS2WHiieiu7ON2gnpHw4ccER/2xGwGr5jZDizp0eysEotIBKumtbk7tebfHpDT7GZsShiIE5qfFI3JlRTwqmLU8xVkWNCAQpIU0JTPPn0W717TU2mk3qs4Q4IgQXGp7yfHTr74pfX/obq8p0ZNsJqKAWIq5JUBKyAyodvuXDuyuVXhtNPnTQhZNmnue5HMac+7sGOseC7gnFQ/+CNfZiLYwxN43/WJYz5dxLh1kgDx2TA/0pLYGxChdsJu+G/0F3WQzqJBg2xqpUySz7gMJQgJ40FNx/zD92rfs44b1qDO7XRmVDvNqWUJqw4qBQhgmhNiBCE7DoU2fbDv4TKqYeqq6kKbQkwYNrT399nZvKlNb+ius7O3oiot8qWK6ccV6icohYLgjbAFWg+t3FDke3pUyaHzI3JMegp4wjEicbmttekJjUZW7AbCoZQBIKA8z5vyZn2nF3Z7j+7Lttd4C3IGxwzA2JKY9zTDpFHqj49tDKUqDRhGB0pAG7zpahfhICj6fp9ZzW/vPZ7Nt1RyJApN1BXg4JRJTxmVsCi0NKGor20rS1jzQXTp1sR3OHmRnGhmK3BXE1q8q8EdiJiBYqh5EIbGC6E0pEL27Om07cdgenyTTawGWN7hTt901Uw3caYCdzscjv1PFrIvd7lTAicFKo6TzWmnYaYTjsqrslRqAl01MVXhIgUIoDVpU68wCBGRBC5RKGEBECIBAim1HAkKisSEZZS/V+UBeYbKYScDyWb58YYHTa3PrJnEeEre01veXnDf282W/wCFS0jgS0rdFDFHaAAOGJmF0Fky5uL9utdmcCu/sysmVIubx6VdxcAIU7aDai2zmpSk38xzU5AE3iKLIu1HBjJFWymaDt80+WHWZ97A9ttTEZZ0ZByKIyzl4CmuNE6vxFia9ABEGQVdFCBiCxGPCEOggOirSAICBIgIbsiIhiA+Cg+SChoGLhCwMkgglIADgEDAR/YFw4EAhArCgUFEcBaYSsmBAlpagOdumfjhcdMTboUcd2dv+fk+pXOpYu3rEsGZKwUUKQqGUX6mpCXflUkiNbK5kz2WjRb3l56+Zx5DqkdCSelNCa0qq2zmtTkny7DCnaIgO+zH0ghlGxg2zLhxl6zstt/rSf/fG+hVYJps4O8wxusJ75ADiAPUJQ+bruIU9OU67yikrKIdc5KpfViRA+FXGriE9GaiUEwgCxk0CNKx5VLoBFjCh1Ex6P6JDYnXAfAJVrZnZ85WV/5/ulTmz3LACgK8aF1nf+1dOOSvFAxsJWkkwG9daiKih2BgBVKss77sFbXz98pptRokooFCOHBlV0rOwrn7zt5DBub16QmNRkbsBsQoBjyAe3J27Vd4ZsbCs+vy7/Qllvd6MPEcDNysYegFzAEyJbZUEyZ6q7aeLRllQpLP6MVEBDG6A1oURhAxEFMxCgdo5iLMUfFNHiKPE0xjQ5hKkbJuCYEh0Araoqr5d15B/jrH5g+sdEVARZRhC+09Zz/+vrFBRHfZ11pjF4+BoCdAgQjwBp0fTr+H458Z96ClOOMVL+L0O3J1T0buv3T9hhfA7ua1OTfQrOrwj8EBBCBopGNPcHyTcW324MXN+aedrLdU7g9H9oOlGy5EU91Lx5TVZlvy9wBWMkCwRLqCStEDeRoTLoY96jOo4RHnqNiDsQc5UX/KnQ0pWKEAjaUVIxamnQiTnFNHT1hQcJT922eOT4W9eZRCCsyuf98rfWZLBSKeRtxzEMZvajcd6Ki5aEFCBFAoUomnaMQb5i/YGo8MSK8i/Ihn1vd25EJ37trcw3salKTfwOw24by0pG1azqDN9cXnuvM32e6uyZLT2+Am8jmqkjbI867CsyZKooUiRyF6BIqQldjTEPcobhWMQ8TMXIIY4o0gacw4VFdUnsOOQpiLjkEybhyHXQUJmPkabQWHAdbUrqtO1zSmnnfwePmTo6zgIAoxM0F//zXVz9QQNOdZYG+NsUR2GFf40QQBIz0UqWBdMI5iNyfzJs/KxmPqtOGI1El7OvrM4WA951V/06UjtSkJjUZvuxQq21CbE4prT0itAi6Ax7q6bYNbjYIQRD8MqhFrjFTcd71hQjQStzV9XFKuxRzMaaVpzHuUtxFV1PcxXj0ukMxhzyHYi66Ch2FMRc9TVqho9DREHPJ1eg5hASepvoEpWPq+aVZB2HGpLgAssCEuPfz3WZftHzN3W46tznDUbACyiisqvLBMdLhXAA2IJIPn/ac9y1ZfOv8BbvW1Q/bfycAWBdTCafEUVNbbTWpyb+rZlfR73oKvKLd39wTrvH9W3ObX0+Avzm0HQA9AJly4zG/7LyzJbYlDZggqktQfUKlYyodVwkHE5oSMXIVJmKUTqiYS55CV6Gj0dWUiKGn0dXkOeg5KAIgEHPIddDRpBV4DqXjFFrJ5Fms9GaDpjpnxqQYlCMGobVfeGPNL7ok095jEgAIGIDovv6woAGw2rkIAKTAgOvsg/qmuXP2bmwYDt5Fln9bj+8bO6058a9WQVGTmtTAbjQiAl15056zvTn7am/+pu6Nq1KU2exzK0APSAEg379PBQOCJIjSWqeT2JDQ6ZhKxygdo4SrUjGVcDHhUUNSOwo8TZ6DMZdchck4uWWw0wq0QkWoFToKXIe0QkLwHCREG9HaiLy5MpdOqpmT41BJmhP52uutP+gO2rsyYJkdlOr22NG/A8nwhNg4rppK6uaZc94zvnm7RA6RGdtbMIGx49JebanVpCb/XBkNEcAQkIkQdynmkKBM0s7ubnJ9NtfT6PkSSsSZbqp8diWmT3QRPUWexoSnEg6mYiUbNulSylNJj+oTKhWj+rhuSOqGpGpI6PqEqkvodJzqEioZo/qEbkypZIxScYq75Gp0dER6C0RICEQ4odntztqeXpNKKkXIAoB4xIR6Nyi8GkKWrCADYikTpXQ90c/VVF8oGIi1XeA83pOZTLQonZJt8nFiuW4QETytpFYvVpOa/B8Au0hchUmXYp6anvL2i6cyvYVNDVR0jeRFfCxhnOnr/kUADlLco5gmT2E6rhIxSnmqLq7ScZ2KUUNKpWKqIaUa06ohpRpSOhWndJzScZVOqISHnkOKUG2dLSNiummsc1yFCoB06Y0CcEBz3WRlny0EvcZSxHhJ1XyfA5EPQAF6aE0GwqeCsM7YvevTEfkqbsutCXoUnalqUpOa/CuDHQAowphDjksNrjqyoY6KZqX40OyGYCUvECAGfdEJtqKJYhrjHsY9imuKuZSKq1ScEh4lXPIccjXGPErEyHPIdSDhUdwjzyHC7bj8K+2qohjo+p7wW3/a2NEZ7DIjGZG2MsJu9cl5Cp/L+z0W0LI4CLqK4rgf2EkpCxlBRHLGPm9DXQwObKyXbbLzDIeHuiY1qcm/H9j1qTMaYx4dOi69u46tDwrZca5xmAsivmBfYTwKiqfQU+QSxlzyXIo5GHPR1UQAMQdjDjk6CrmSViWH3TbQI8K4qDlOJC+tzV99z7pr7l4f99SJ+zROaHCi0CgBWJGd6pKL4vrJQm+XQxSR3fcZnFhublBt4hKgAoGCsa8ImWzu0KYG+NdjcKpJTWoyUPMYkwDF1oRBCDAf2l+ub//Fpo41odP2dg7eFtvGEmJUJZZUOKnem9igx6dVU1I3pnVDohSZHVevkx6l4qoxpeIexRxMeJTwhuDoL3HT9Q+SPrG297bX2x9ZVZgS8Cf2m3TageMGfzDKm3ulu+eC1a0vZVAyvvXK1E9UziGWoZKJRTRQQ338vIT3jTkzFeGOlNDWpCY1+fcGO6giZd6cD36+bsuvN3RuzsR63iqE6wz0IhdFhTil2Zk2wZ1Q5zTEKB1XTUnVmNIJl+oSlIqp+oSqS1AqRjGPPIeSMXIUSpmoNiIErtap1mf9+9d3/XZ9x5ZQTw7t+TtNeO/sJodKfUIHq4VRHsnybP68t1Y/XyA/WzBa+uzXii070D4FYdAIyabEWcq9ZsGMuFOLQtSkJv8fgx2Uda4IZdZn/DtbO+5o7V7RrTMdXNhY8LqxBfXEuG6u1ylPpWM0Lq2bUqoxqRMe1cVVY1LFY5SKUcLFZExFbruBp2BZXvQf3dJ1z7rO1UTE4RENqTOmtOzTkC5hLkdN0YfGogjvNhaKH1+2/OFAm+6CRRHc+vWUewCjAYWQbq47GeD7u8xMurpWFlaTmvz/C3YluCm1/0AA6A3sQ+t7/rq8+9E12c35WNjJ0FVoJGp0dXNCz2j0pje6E+qd5pROxykVV/UJSniUjquGlEokCAAKIff4Zr0fLM7mXujIvZbN9MZjLMEenntkS/17xjVMcWPl8/YPrm5FIrxr8wufX7Lm/kD19GQs9vHoDwS7apWVQTO4zemTSX6466x0zBnzjpE1qUlN/p3ArgJ5AlDxrLV2+0+3Zh96O/Pi2syGDmOsZ6ziINRiGuPU4jkJD2MxchLgxUl7CDHJke0m28Z+6GqvPgG22EK8V0PiyMbGfRrSE2JOxXwGERxJnVaklPmhvXTZ6p/nodjea0DEKVMYVKOeVNm2UmJOiadTxyDetNf08UlvFJRQNalJTf5PgV2VYVvqLBlJ3rebsuGazmBle3HlFn9FR7EjG2Zz1mcBR0QjaQEPxIOmtGqpd+Y3x6bUe7vUJWYlvEkxr7qDIO8AnXqEd8bay5e13lIwuQ1Zqyw7CGYosKv+lUAJxL3kvjH50W7T59YlanhXk5rUwG6AbYsAQ9t9ImK41FVHYVkfHApBKt3/dtxfJqXWZ/Ktleuu7yy2t2UB2ACWIr5YwdR+wIcIKIAsKhnf14Uf7Dp91+ZUDe9qUpMa2A0BMVLOkkNEhG25+bk86Ar4jS2kVL78B2s2XNGW3dSeJYNCAiU2v/7vgyr4IyBhiemFWn9/56mHTqyvrbCa1KQGdtuFv36MoVXI8o9I361EkO/YsOXLK9rarRPxgDIgRMTyVAlfoCCggEhECgWqyBR3JifMFeNTp0yeoKhWRFGTmtTA7l9YREAQCODl9szKYmitLYZsBFjEAhgQ6GtlK9YCEhBBaEBCcT1wXKoP+ajJTePS8Vp9RU1qUgO7f3Wp1UXUpCb/N0TXpmDbQlUuwlF9vKbS1aQmNc2uJjWpSU3+gYpLTWpSk5rUwK4mNalJTWpgV5Oa1KQmNbCrSU1qUpMa2NWkJjWpSQ3salKTmtSkBnY1qUlNalIDu5rUpCY1qYFdTWpSkxrY1aQmNanJ/3H5f8SXz3imx6PKAAAAAElFTkSuQmCC';
  const PKEY = 'qx_lbl_printer';

  /* ---------- Configuración (Config_QORVEX.json → labels) ---------- */
  const DEF = () => ({
    logo: true,
    comps: [['Arnés', 'AA'], ['BCM', 'BA'], ['Cluster', 'CA'], ['Switch Gde', 'DA'], ['Switch CH', 'EA'], ['Llaves', 'FA']].map(([n, p]) => ({ n, p, pd: 'R' + p[0], a: true })),
    lines: ['011', '065', '014', '044'].map((l) => ({ l, a: true })),
  });
  function norm(cfg) {
    const l = (cfg && cfg.labels) || {}, d = DEF();
    const comps = Array.isArray(l.comps) ? l.comps.map((x) => { const p = String(x.p || '').trim().toUpperCase(), pd = String(x.pd || '').trim().toUpperCase(); return { n: String(x.n || '').trim(), p, pd: validPrefix(pd) ? pd : 'R' + (p[0] || 'X'), a: x.a !== false }; }).filter((x) => x.n && validPrefix(x.p)) : d.comps;
    const lines = Array.isArray(l.lines) ? l.lines.map((x) => ({ l: String(x.l || '').trim(), a: x.a !== false })).filter((x) => x.l) : d.lines;
    return { logo: l.logo !== false, comps, lines };
  }

  /* ---------- IDs (lógica pura) ---------- */
  const pad3 = (n) => String(n).padStart(3, '0');
  const formatId = (p, n) => p + pad3(n);
  function validPrefix(p) { return typeof p === 'string' && /^[A-Z]{1,4}$/.test(p); }
  function nextPrefix(p) {
    const c = p.split(''); let i = c.length - 1;
    while (i >= 0) { if (c[i] !== 'Z') { c[i] = String.fromCharCode(c[i].charCodeAt(0) + 1); return c.join(''); } c[i] = 'A'; i--; }
    return 'A' + c.join('');
  }
  function allocate(prefix, last, qty) {
    if (!validPrefix(prefix)) throw new Error('Prefijo inválido: ' + prefix);
    if (!Number.isInteger(qty) || qty < 1) throw new Error('La cantidad debe ser un entero mayor a 0');
    const ids = []; let p = prefix, n = last;
    for (let i = 0; i < qty; i++) { if (n >= MAXP) { p = nextPrefix(p); n = 0; } n++; ids.push(formatId(p, n)); }
    return { ids, prefix: p, last: n };
  }
  const pIdx = (p) => [...p].reduce((a, ch) => a * 26 + (ch.charCodeAt(0) - 64), 0); // AA=27 … ZZ=702, AAA=703
  const ord = (p, n) => pIdx(p) * 1000 + n;
  const parseId = (id) => { const m = /^([A-Z]{1,4})(\d{3,})$/.exec(String(id || '')); return m ? { p: m[1], n: +m[2] } : null; };
  const lineaKey = (op, linea) => (op === 'Secuencia' ? String(linea) : '');
  const ckey = (op, comp, linea) => `${op}|${comp}|${lineaKey(op, linea)}`;

  /* ---------- Code 128 (B) en SVG, sin librerías ---------- */
  const C128 = '212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 221312 231212 112232 122132 122231 113222 123122 123221 223211 221132 221231 213212 223112 312131 311222 321122 321221 312212 322112 322211 212123 212321 232121 111323 131123 131321 112313 132113 132311 211313 231113 231311 112133 112331 132131 113123 113321 133121 313121 211331 231131 213113 213311 213131 311123 311321 331121 312113 312311 332111 314111 221411 431111 111224 111422 121124 121421 141122 141221 112214 112412 122114 122411 142112 142211 241211 221114 413111 241112 134111 111242 121142 121241 114212 124112 124211 411212 421112 421211 212141 214121 412121 111143 111341 131141 114113 114311 411113 411311 113141 114131 311141 411131 211412 211214 211232 2331112'.split(' ');
  function code128(text) {
    const vals = [104]; // Start B
    for (const ch of String(text)) { const v = ch.charCodeAt(0) - 32; if (v < 0 || v > 94) throw new Error('Carácter no válido para Code 128: ' + ch); vals.push(v); }
    vals.push(vals.reduce((s, v, i) => s + v * (i || 1), 0) % 103, 106);
    return vals.map((v) => C128[v]).join('');
  }
  function barcodeSVG(text) {
    const w = code128(text), q = 10; let x = q, bars = '';
    for (let i = 0; i < w.length; i++) { const k = +w[i]; if (i % 2 === 0) bars += `<rect x="${x}" y="0" width="${k}" height="60"/>`; x += k; }
    return `<svg class="qxl-bc" viewBox="0 0 ${x + q} 60" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><g fill="#000">${bars}</g></svg>`;
  }

  /* ---------- Texto separado por tabulador ---------- */
  const clean = (v) => String(v == null ? '' : v).replace(/[\t\r\n]+/g, ' ').trim();
  const toLine = (a) => a.map(clean).join('\t');
  function parse(text) {
    const L = String(text || '').replace(/^﻿/, '').split(/\r?\n/).filter((s) => s.trim() !== '');
    if (!L.length) return [];
    const h = L[0].split('\t');
    return L.slice(1).map((s) => { const c = s.split('\t'), o = {}; h.forEach((k, i) => (o[k] = c[i] == null ? '' : c[i])); return o; });
  }
  const pad = (n) => String(n).padStart(2, '0');
  const today = (d = new Date()) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  const nowHM = (d = new Date()) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const monthTag = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- Archivos ---------- */
  async function perm(dir) {
    if (!dir) throw new Error('Primero conecta la carpeta Data Base.');
    if (dir.queryPermission && (await dir.queryPermission({ mode: 'readwrite' })) === 'granted') return;
    if (dir.requestPermission && (await dir.requestPermission({ mode: 'readwrite' })) === 'granted') return;
    throw new Error('Sin permiso para escribir en la carpeta Data Base.');
  }
  const sub = async (dir) => dir.getDirectoryHandle(DIRN, { create: true });
  async function readText(d, name) {
    try { const f = await (await d.getFileHandle(name)).getFile(); return await f.text(); }
    catch (e) { if (e && e.name === 'NotFoundError') return null; throw e; }
  }
  async function writeWhole(d, name, text) {
    const w = await (await d.getFileHandle(name, { create: true })).createWritable();
    try { await w.write(text); await w.close(); } catch (e) { try { await w.abort(); } catch (x) {} throw e; }
  }
  async function append(d, name, head, lines) {
    if (!lines.length) return;
    const fh = await d.getFileHandle(name, { create: true }), size = (await fh.getFile()).size;
    const w = await fh.createWritable({ keepExistingData: true });
    try { await w.seek(size); await w.write((size ? '' : '﻿' + toLine(head) + '\r\n') + lines.map(toLine).join('\r\n') + '\r\n'); await w.close(); }
    catch (e) { try { await w.abort(); } catch (x) {} throw e; }
  }
  async function readJson(d, name) { const t = await readText(d, name); if (!t) return null; try { return JSON.parse(t); } catch (e) { return null; } }

  /* ---------- Candado de reserva (un equipo a la vez) ---------- */
  async function withLock(ctx, fn) {
    const d = await sub(ctx.dir()), me = ctx.dev(), u = ctx.user() || {};
    const tok = `${me}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, t0 = Date.now();
    let cur = null;
    for (;;) {
      cur = await readJson(d, LOCK);
      const busy = cur && !cur.released && cur.tok !== tok && Date.now() - (+cur.at || 0) < T.stale;
      if (!busy) {
        await writeWhole(d, LOCK, JSON.stringify({ tok, dev: me, who: u.name || '', at: Date.now() }));
        await sleep(T.verify);
        const chk = await readJson(d, LOCK);
        if (chk && chk.tok === tok) break;
      }
      if (Date.now() - t0 > T.wait) throw new Error(`Otro equipo (${(cur && cur.dev) || '?'}) está reservando etiquetas. Intenta de nuevo en unos segundos.`);
      await sleep(T.retry);
    }
    try { return await fn(d); }
    finally { try { await writeWhole(d, LOCK, JSON.stringify({ released: true, dev: me, at: Date.now() })); } catch (e) { /* vence solo en 20 s */ } }
  }

  /* ---------- Registro y consecutivos ---------- */
  async function loadAll(d) {
    const rows = [];
    for await (const [name, h] of d.entries()) {
      if (h.kind !== 'file' || !RE.test(name)) continue;
      parse(await (await h.getFile()).text()).forEach((r) => { r._file = name; rows.push(r); });
    }
    rows.sort((a, b) => (+a.Registrado || 0) - (+b.Registrado || 0));
    return rows;
  }
  /** Una fila por etiqueta (Lote + ID); el último movimiento define el Estado */
  function fold(rows) {
    const M = new Map();
    rows.forEach((r) => {
      const k = `${r.Lote}|${r.ID}`, o = M.get(k);
      if (!o) { M.set(k, Object.assign({}, r, { reimp: 0, last: r })); return; }
      if (r.Estado === 'Reimpreso') o.reimp++;
      else o.Estado = r.Estado;
      if (r.Estado === 'Anulado') o.Motivo = r.Motivo;
      o.last = r;
    });
    return [...M.values()];
  }
  async function readCons(d) { return parse(await readText(d, CONS)); }
  function regMax(rows) {
    const M = {};
    rows.forEach((r) => {
      if (r.Operacion === 'Línea') return;
      const id = parseId(r.ID); if (!id) return;
      const k = ckey(r.Operacion, r.Componente, r.Linea);
      if (!M[k] || ord(id.p, id.n) > ord(M[k].p, M[k].n)) M[k] = id;
    });
    return M;
  }
  /** Contador vigente de una clave: el mayor entre el archivo de consecutivos y lo registrado */
  function counterOf(cons, rmax, op, comp, linea, base) {
    const k = ckey(op, comp, linea), c = cons.find((r) => ckey(r.Operacion, r.Componente, r.Linea) === k);
    let cur = c && validPrefix(c.Prefijo) ? { p: c.Prefijo, n: +c.Ultimo || 0 } : { p: base, n: 0 };
    const r = rmax[k]; if (r && ord(r.p, r.n) > ord(cur.p, cur.n)) cur = { p: r.p, n: r.n };
    return cur;
  }
  const regName = (dev) => `Etiquetas_${dev}_${monthTag()}.txt`;
  const row = (ctx, o) => { const u = ctx.user() || {}, now = new Date(); return [o.fecha || today(now), o.hora || nowHM(now), ctx.dev(), u.emp || '', u.name || '', o.op, o.comp, o.linea || '', o.id, o.pos, o.lote, o.estado, printer(), Date.now(), o.motivo || '']; };

  /** Reserva qty IDs nuevos (con candado). Devuelve el lote listo para vista previa. */
  async function reserve(ctx, op, comp, linea, qty) {
    const C = norm(ctx.cfg()), cp = C.comps.find((c) => c.n === comp);
    if (!cp) throw new Error('Componente no configurado: ' + comp);
    const basePre = op === 'Devolución' ? cp.pd : cp.p;
    await perm(ctx.dir());
    return withLock(ctx, async (d) => {
      const cons = await readCons(d), all = await loadAll(d);
      const cur = counterOf(cons, regMax(all), op, comp, linea, basePre);
      const al = allocate(cur.p, cur.n, qty), now = new Date(), fecha = today(now), hora = nowHM(now), lote = `${ctx.dev()}-${Date.now()}`;
      // 1) registro primero: aunque falle lo demás, esos IDs ya no se reutilizan
      await append(d, regName(ctx.dev()), HEAD, al.ids.map((id, i) => row(ctx, { fecha, hora, op, comp, linea: op === 'Secuencia' ? linea : '', id, pos: `${i + 1}/${qty}`, lote, estado: 'Reservado' })));
      // 2) consecutivo
      const k = ckey(op, comp, linea), out = cons.filter((r) => ckey(r.Operacion, r.Componente, r.Linea) !== k);
      out.push({ Operacion: op, Componente: comp, Linea: lineaKey(op, linea), Prefijo: al.prefix, Ultimo: al.last, Actualizado: new Date().toISOString(), Equipo: ctx.dev() });
      await writeWhole(d, CONS, '﻿' + [CHEAD, ...out.map((r) => CHEAD.map((h) => r[h]))].map(toLine).join('\r\n') + '\r\n');
      return { op, comp, linea: op === 'Secuencia' ? linea : '', ids: al.ids, qty, fecha, hora, lote };
    });
  }
  /** Línea: sin consecutivo ni código de barras; un renglón por lote */
  async function reserveLinea(ctx, comp, linea, qty) {
    await perm(ctx.dir());
    const d = await sub(ctx.dir()), now = new Date(), fecha = today(now), hora = nowHM(now), lote = `${ctx.dev()}-LIN${Date.now()}`;
    await append(d, regName(ctx.dev()), HEAD, [row(ctx, { fecha, hora, op: 'Línea', comp, linea, id: '—', pos: `${qty} cop.`, lote, estado: 'Reservado' })]);
    return { op: 'Línea', comp, linea, ids: Array.from({ length: qty }, () => ''), qty, fecha, hora, lote };
  }
  /** Cambia el estado de un lote (agrega un movimiento por etiqueta) */
  async function mark(ctx, b, estado, motivo) {
    const d = await sub(ctx.dir());
    const ids = b.op === 'Línea' ? ['—'] : b.ids;
    await append(d, regName(ctx.dev()), HEAD, ids.map((id, i) => row(ctx, { op: b.op, comp: b.comp, linea: b.linea, id, pos: b.op === 'Línea' ? `${b.qty} cop.` : `${i + 1}/${b.qty}`, lote: b.lote, estado, motivo })));
  }

  /* ---------- Impresora de este equipo ---------- */
  function printer(v) {
    try { if (v !== undefined) localStorage.setItem(PKEY, v); return localStorage.getItem(PKEY) || ''; } catch (e) { return v || ''; }
  }

  /* ---------- Etiqueta (HTML) ---------- */
  function labelHTML(d, logo) {
    if (d.op === 'Línea') return `<div class="qxl-lab"><div class="qxl-g qxl-lg">
      <div class="qxl-head"><b>${esc(d.comp.toUpperCase())}</b></div>
      <div class="qxl-big">L-${esc(d.linea)}</div>
      <div class="qxl-foot qxl-fc"><div class="qxl-date"><span>FECHA Y HORA</span><b>${esc(d.fecha)} ${esc(d.hora)}</b></div></div></div></div>`;
    let bc = ''; try { bc = barcodeSVG(d.id); } catch (e) { bc = ''; }
    return `<div class="qxl-lab"><div class="qxl-g">
      <div class="qxl-logo">${logo ? `<img src="${QLOGO}" alt="QORVEX">` : `<b class="qxl-opsm">${esc(d.op.toUpperCase())}</b>`}</div>
      <div class="qxl-op">${esc(d.op.toUpperCase())}</div>
      <div class="qxl-lin"><span>LÍNEA</span><b>${esc(d.linea || '—')}</b></div>
      <div class="qxl-comp"><span>COMPONENTE</span><b>${esc(d.comp.toUpperCase())}</b></div>
      <div class="qxl-id">${esc(d.id)}</div>
      <div class="qxl-cons"><span>CONSECUTIVO</span><b>${d.pos} / ${d.total}</b></div>
      <div class="qxl-foot"><div class="qxl-date"><span>FECHA Y HORA</span><b>${esc(d.fecha)} ${esc(d.hora)}</b></div>${bc}</div></div></div>`;
  }
  const listOf = (b) => b.ids.map((id, i) => ({ op: b.op, comp: b.comp, linea: b.linea, id, pos: i + 1, total: b.qty, fecha: b.fecha, hora: b.hora }));

  const CSS = `
.qxl-wrap{display:flex;flex-direction:column;gap:14px;}
.qxl-h{margin:0;color:inherit;font-size:18px;font-weight:800;letter-spacing:.04em;;-webkit-text-fill-color:currentColor;background:none}
.qxl-h small{font-size:13px;font-weight:600;color:var(--muted,#888);-webkit-text-fill-color:currentColor;letter-spacing:0;margin-left:6px}
.qxl-form label[hidden]{display:none}
.dpanel .qxl-h,.dpanel .qxl-range,.dpanel .qxl-tbl td{color:#0A1A3A;-webkit-text-fill-color:#0A1A3A}
.dpanel .qxl-tbl th,.dpanel .qxl-muted{color:#5B6B85}
.qxl-sub{display:flex;gap:6px;flex-wrap:wrap}
.qxl-sub .on{outline:2px solid currentColor;outline-offset:-2px;font-weight:800}
.qxl-form{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;align-items:end}
.qxl-form label{display:flex;flex-direction:column;gap:5px;font-size:13px;color:var(--muted,#888);font-weight:600}
.qxl-range{;grid-column:1/-1;padding:10px 12px;border:1px solid var(--line,rgba(128,128,128,.35));border-radius:8px;font-weight:700}
.qxl-act{display:flex;gap:8px;flex-wrap:wrap;align-items:center;grid-column:1/-1}
.qxl-err{color:#e5484d;font-weight:600;min-height:18px;grid-column:1/-1;margin:0}
.qxl-prev{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px}
.qxl-tw{overflow-x:auto}
.qxl-tbl{width:100%;border-collapse:collapse;font-size:13px}
.qxl-tbl th,.qxl-tbl td{text-align:left;padding:7px 8px;border-bottom:1px solid var(--line,rgba(128,128,128,.3));white-space:nowrap}
.qxl-tbl th{color:var(--muted,#888);font-weight:700}
.qxl-st{-webkit-text-fill-color:currentColor;display:inline-block;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:700;border:1px solid currentColor}
.qxl-st.Impreso{color:#17a35b}.qxl-st.Enviado{color:#d99a00}.qxl-st.Reservado{color:#3b82f6}.qxl-st.Anulado{color:#e5484d}
.qxl-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.qxl-muted{color:var(--muted,#888);font-size:13px}
/* etiqueta 6 × 4 (siempre blanco y negro) */
.qxl-lab{box-sizing:border-box;width:100%;aspect-ratio:3/2;background:#000;padding:2px;color:#000;font-family:Arial,Helvetica,sans-serif;container-type:inline-size}
.qxl-g{display:grid;grid-template-columns:25% 1fr;grid-template-rows:24fr 17fr 41fr 18fr;gap:2px;height:100%;min-height:0}
.qxl-g>div{min-height:0;min-width:0;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;line-height:1.05}
.qxl-g span{font-size:2.6cqw;font-weight:700;letter-spacing:.1em}
.qxl-logo{padding:4px}.qxl-logo img{max-width:100%;max-height:100%;object-fit:contain}
.qxl-opsm{font-size:3.4cqw;font-weight:900}
.qxl-op{font-family:"Arial Black",Arial,sans-serif;font-weight:900;font-size:10.5cqw;letter-spacing:.02em}
.qxl-lin b{font-size:5.5cqw}.qxl-comp b{font-size:6.5cqw;font-weight:900}.qxl-cons b{font-size:4.8cqw}
.qxl-id{grid-column:1/span 2;font-family:"Arial Black",Arial,sans-serif;font-weight:900;font-size:24cqw;letter-spacing:.02em}
.qxl-foot{flex-direction:row!important;justify-content:space-between!important;padding:0 2.2cqw;gap:8px}
.qxl-fc{justify-content:center!important}
.qxl-date b{display:block;font-size:3.5cqw;white-space:nowrap}
.qxl-bc{width:30cqw;height:9.5cqw;flex:none}
.qxl-lg{grid-template-columns:1fr;grid-template-rows:20fr 62fr 18fr}
.qxl-head{flex-direction:row!important;padding:0 14px}.qxl-head b{font-family:"Arial Black",Arial,sans-serif;font-weight:900;font-size:6.6cqw}
.qxl-big{font-family:"Arial Black",Arial,sans-serif;font-weight:900;font-size:21cqw;letter-spacing:.02em}
#qxLblPrint{display:none}
@media print{
  body.qx-lbl-print>*:not(#qxLblPrint){display:none!important}
  body.qx-lbl-print>#qxLblPrint{display:block!important}
  body.qx-lbl-print{background:#fff!important;margin:0!important;padding:0!important}
  #qxLblPrint .qxl-lab{width:100%;height:calc(4in - 2.6cm - 2px);aspect-ratio:auto;break-inside:avoid;page-break-inside:avoid;break-after:page;page-break-after:always;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  #qxLblPrint .qxl-lab:last-child{break-after:auto;page-break-after:auto}
}`;
  function ensureCSS() {
    if (document.getElementById('qxLblCss')) return;
    const s = document.createElement('style'); s.id = 'qxLblCss'; s.textContent = CSS; document.head.appendChild(s);
  }

  /** Imprime con el diálogo de Windows (página 6 × 4 in, márgenes 1.3 cm) */
  function runPrint(list, logo) {
    ensureCSS();
    return new Promise((resolve) => {
      let area = document.getElementById('qxLblPrint');
      if (!area) { area = document.createElement('div'); area.id = 'qxLblPrint'; document.body.appendChild(area); }
      area.innerHTML = list.map((d) => labelHTML(d, logo)).join('');
      const pg = document.createElement('style'); pg.id = 'qxLblPage'; pg.textContent = '@page{size:6in 4in;margin:1.3cm}';
      document.head.appendChild(pg); document.body.classList.add('qx-lbl-print');
      setTimeout(() => {
        try { window.print(); } finally {
          document.body.classList.remove('qx-lbl-print'); pg.remove(); area.innerHTML = '';
          resolve();
        }
      }, 150);
    });
  }

  /* =====================================================================
     Pantalla
     ===================================================================== */
  const V = { view: 'gen', batch: null, q: '', busy: false };
  async function render(el, ctx) {
    ensureCSS();
    const C = norm(ctx.cfg()), P = ctx.ui.panel, H = ctx.ui.head, admin = ctx.isAdmin();
    const has = !!ctx.dir();
    const tabs = [['gen', 'Generar'], ['hist', 'Historial'], ['cons', 'Último ID']];
    el.innerHTML = `<div class="qxl-wrap">
      <div class="${P}"><div class="${H}"><h2 class="qxl-h">ETIQUETAS <small>6 × 4 in · Validación · Secuencia · Devolución · Línea</small></h2></div>
        <div class="qxl-row" style="margin-top:8px"><div class="qxl-sub">${tabs.map(([k, t]) => `<button class="btn sm ${V.view === k ? 'on' : ''}" data-v="${k}">${t}</button>`).join('')}</div>
        <span style="flex:1"></span><span class="qxl-muted">Equipo <b>${esc(ctx.dev())}</b> · Impresora</span>
        <input class="input" id="qxlPr" style="max-width:220px;height:32px" placeholder="Nombre en Windows" value="${esc(printer())}"><button class="btn sm" id="qxlPrS">Guardar</button></div></div>
      <div id="qxlBody"></div></div>`;
    el.querySelectorAll('[data-v]').forEach((b) => (b.onclick = () => { V.view = b.dataset.v; render(el, ctx); }));
    el.querySelector('#qxlPrS').onclick = () => { printer(el.querySelector('#qxlPr').value.trim()); ctx.toast('Impresora guardada en este equipo', 'ok'); };
    const body = el.querySelector('#qxlBody');
    if (!has) { body.innerHTML = `<div class="${P}"><p class="qxl-muted">Conecta la carpeta Data Base para generar etiquetas.</p></div>`; return; }
    if (V.view === 'gen') return vGen(body, ctx, C);
    if (V.view === 'hist') return vHist(body, ctx, C, admin);
    return vCons(body, ctx, C);
  }

  function vGen(body, ctx, C) {
    const P = ctx.ui.panel, comps = C.comps.filter((c) => c.a), lines = C.lines.filter((l) => l.a);
    body.innerHTML = `<div class="${P}">
      <div class="qxl-form">
        <label>Operación<select class="input" id="qxlOp">${OPS.map((o) => `<option>${o}</option>`).join('')}</select></label>
        <label>Componente<select class="input" id="qxlComp">${comps.map((c) => `<option value="${esc(c.n)}">${esc(c.n)} (${esc(c.p)})</option>`).join('')}</select></label>
        <label id="qxlLinL">Línea<select class="input" id="qxlLin">${lines.map((l) => `<option>${esc(l.l)}</option>`).join('')}</select></label>
        <label>Cantidad de etiquetas<input class="input" id="qxlQty" type="number" min="1" max="${MAXQ}" value="1"></label>
        <div class="qxl-range" id="qxlRange">…</div>
        <div class="qxl-act"><button class="btn primary" id="qxlGen">Generar y reservar</button></div>
        <p class="qxl-err" id="qxlErr"></p>
      </div></div>
      <div class="${P}" id="qxlPrevP" hidden><div class="qxl-row"><h2 class="qxl-h">Vista previa</h2><span style="flex:1"></span>
        <button class="btn" id="qxlCancel">Cancelar lote</button><button class="btn primary" id="qxlPrint">Imprimir</button></div>
        <div class="qxl-prev" id="qxlPrev" style="margin-top:10px"></div><p class="qxl-muted" id="qxlMore"></p></div>`;
    const $ = (s) => body.querySelector(s);
    if (!comps.length) { $('#qxlErr').textContent = 'No hay componentes activos. El Administrador los configura en QORVEX › CONFIG › Etiquetas.'; $('#qxlGen').disabled = true; }
    let cons = [], rmax = {};
    const sync = () => { const o = $('#qxlOp').value; $('#qxlLinL').hidden = o === 'Validación' || o === 'Devolución'; };
    const upd = () => {
      sync();
      const op = $('#qxlOp').value, comp = $('#qxlComp').value, lin = $('#qxlLin').value, qty = Number($('#qxlQty').value);
      const R = $('#qxlRange');
      if (!comp || !Number.isInteger(qty) || qty < 1 || qty > MAXQ) { R.textContent = `Cantidad inválida (1 a ${MAXQ}).`; return; }
      if ((op === 'Secuencia' || op === 'Línea') && !lin) { R.textContent = 'No hay líneas activas.'; return; }
      if (op === 'Línea') { R.textContent = `Se imprimirán ${qty} copia(s) de L-${lin} para ${comp}. Sin consecutivo ni código de barras.`; return; }
      const cp = C.comps.find((c) => c.n === comp), cur = counterOf(cons, rmax, op, comp, lin, op === 'Devolución' ? cp.pd : cp.p), al = allocate(cur.p, cur.n, qty);
      R.textContent = `Se generará de ${al.ids[0]} a ${al.ids[al.ids.length - 1]} (${qty} etiquetas)${op === 'Secuencia' ? ' · línea ' + lin : ''}${al.prefix !== cur.p ? ' · incluye cambio de prefijo a ' + al.prefix : ''}. El rango final se confirma al reservar.`;
    };
    ['#qxlOp', '#qxlComp', '#qxlLin'].forEach((s) => ($(s).onchange = upd)); $('#qxlQty').oninput = upd;
    (async () => { try { const d = await sub(ctx.dir()); cons = await readCons(d); rmax = regMax(await loadAll(d)); } catch (e) { /* solo vista previa */ } upd(); })();
    upd();
    const showPrev = () => {
      const b = V.batch; if (!b) { $('#qxlPrevP').hidden = true; return; }
      $('#qxlPrevP').hidden = false;
      $('#qxlPrev').innerHTML = listOf(b).slice(0, 6).map((d) => labelHTML(d, C.logo)).join('');
      $('#qxlMore').textContent = b.qty > 6 ? `Se muestran 6 de ${b.qty}. Se imprimirán todas.` : '';
    };
    showPrev();
    $('#qxlGen').onclick = async () => {
      if (V.busy) return;
      const err = (m) => ($('#qxlErr').textContent = m); err('');
      if (V.batch) return err('Primero imprime o cancela el lote en vista previa.');
      const op = $('#qxlOp').value, comp = $('#qxlComp').value, lin = $('#qxlLin').value, qty = Number($('#qxlQty').value);
      if (!comp || ((op === 'Secuencia' || op === 'Línea') && !lin)) return err('Selecciona operación, componente y línea.');
      if (!Number.isInteger(qty) || qty < 1 || qty > MAXQ) return err(`La cantidad debe ser entera entre 1 y ${MAXQ}.`);
      if (!(await ctx.confirm('Confirmar etiquetas', `<p>¿Confirmas <b>${qty}</b> ${op === 'Línea' ? `copia(s) de <b>L-${esc(lin)}</b>` : 'etiqueta(s)'} de <b>${esc(comp)}</b>${op === 'Secuencia' ? ` para la línea <b>${esc(lin)}</b>` : ''}?</p>`, 'Generar'))) return;
      V.busy = true; $('#qxlGen').disabled = true; $('#qxlGen').textContent = 'Reservando…';
      try {
        V.batch = op === 'Línea' ? await reserveLinea(ctx, comp, lin, qty) : await reserve(ctx, op, comp, lin, qty);
        if (op !== 'Línea') ctx.toast(`Reservado: ${V.batch.ids[0]} a ${V.batch.ids[V.batch.ids.length - 1]}`, 'ok');
        showPrev(); $('#qxlPrevP').scrollIntoView({ behavior: 'smooth' });
        try { const d = await sub(ctx.dir()); cons = await readCons(d); rmax = regMax(await loadAll(d)); } catch (e) {} upd();
      } catch (e) { err('No se reservó: ' + (e.message || e) + '. No se imprimió nada.'); }
      finally { V.busy = false; $('#qxlGen').disabled = false; $('#qxlGen').textContent = 'Generar y reservar'; }
    };
    $('#qxlPrint').onclick = async () => {
      const b = V.batch; if (!b) return;
      try { await mark(ctx, b, 'Enviado'); } catch (e) { return ctx.toast('No se pudo registrar el envío: ' + (e.message || e), 'err', 6000); }
      await runPrint(listOf(b), C.logo);
      const ok = await ctx.confirm('¿Salieron bien?', `<p>¿Se imprimieron correctamente las <b>${b.qty}</b> etiquetas${printer() ? ` en <b>${esc(printer())}</b>` : ''}?</p><p class="qxl-muted">Si eliges «No», quedan como <b>Enviado</b> para revisión y puedes reimprimirlas desde Historial.</p>`, 'Sí, salieron bien');
      try { if (ok) await mark(ctx, b, 'Impreso'); ctx.toast(ok ? 'Impresión confirmada' : 'Lote marcado como Enviado', ok ? 'ok' : 'warn'); }
      catch (e) { ctx.toast('No se pudo actualizar el estado: ' + (e.message || e), 'err', 6000); }
      V.batch = null; showPrev();
    };
    $('#qxlCancel').onclick = async () => {
      const b = V.batch; if (!b) return;
      if (!(await ctx.confirm('Cancelar lote', '<p>Los IDs ya reservados quedan <b>anulados</b> y no se vuelven a usar.</p>', 'Cancelar lote'))) return;
      try { await mark(ctx, b, 'Anulado', 'Lote cancelado antes de imprimir'); ctx.toast('Lote anulado. Los IDs no se reutilizan.', 'ok'); V.batch = null; showPrev(); }
      catch (e) { ctx.toast('Error al anular: ' + (e.message || e), 'err', 6000); }
    };
  }

  async function vHist(body, ctx, C, admin) {
    const P = ctx.ui.panel;
    body.innerHTML = `<div class="${P}"><div class="qxl-row"><h2 class="qxl-h">Historial</h2><span style="flex:1"></span>
      <input class="input" id="qxlQ" style="max-width:300px" placeholder="Buscar ID, componente, línea, usuario o equipo" value="${esc(V.q)}"><button class="btn sm" id="qxlRe">Actualizar</button></div>
      <div class="qxl-tw" style="margin-top:10px"><table class="qxl-tbl"><thead><tr><th>Fecha</th><th>Hora</th><th>Equipo</th><th>Usuario</th><th>Operación</th><th>Componente</th><th>Línea</th><th>ID</th><th>Posición</th><th>Estado</th><th>Reimpr.</th><th></th></tr></thead><tbody id="qxlTb"><tr><td colspan="12" class="qxl-muted">Cargando…</td></tr></tbody></table></div></div>`;
    const $ = (s) => body.querySelector(s);
    let rows = [];
    try { rows = fold(await loadAll(await sub(ctx.dir()))).reverse(); } catch (e) { $('#qxlTb').innerHTML = `<tr><td colspan="12">No se pudo leer: ${esc(e.message)}</td></tr>`; return; }
    const draw = () => {
      const q = V.q.trim().toLowerCase();
      const list = rows.filter((r) => !q || [r.ID, r.Componente, r.Linea, r.Nombre, r['No. Empleado'], r.Equipo, r.Estado].some((v) => String(v).toLowerCase().includes(q))).slice(0, 300);
      $('#qxlTb').innerHTML = list.map((r) => `<tr><td>${esc(r.Fecha)}</td><td>${esc(r.Hora)}</td><td>${esc(r.Equipo)}</td><td>${esc(r.Nombre || r['No. Empleado'])}</td><td>${esc(r.Operacion)}</td><td>${esc(r.Componente)}</td><td>${esc(r.Linea || '—')}</td><td><b>${esc(r.ID)}</b></td><td>${esc(r.Posicion)}</td>
        <td><span class="qxl-st ${esc(r.Estado)}" title="${esc(r.Motivo || '')}">${esc(r.Estado)}</span></td><td>${r.reimp || ''}</td>
        <td>${r.Operacion === 'Línea' || r.Estado === 'Anulado' ? '' : `<button class="btn sm" data-rp="${esc(r.Lote)}|${esc(r.ID)}">Reimprimir</button>${admin ? ` <button class="btn sm" data-an="${esc(r.Lote)}|${esc(r.ID)}">Anular</button>` : ''}`}</td></tr>`).join('') || '<tr><td colspan="12" class="qxl-muted">Sin registros.</td></tr>';
      body.querySelectorAll('[data-rp]').forEach((b) => (b.onclick = () => reprint(b.dataset.rp)));
      body.querySelectorAll('[data-an]').forEach((b) => (b.onclick = () => annul(b.dataset.an)));
    };
    const find = (k) => rows.find((r) => `${r.Lote}|${r.ID}` === k);
    const one = (r, estado, motivo) => ({ op: r.Operacion, comp: r.Componente, linea: r.Linea, ids: [r.ID], qty: 1, lote: r.Lote, pos: r.Posicion, estado, motivo });
    async function reprint(k) {
      const r = find(k); if (!r) return;
      if (!(await ctx.confirm('Reimprimir', `<p>¿Reimprimir <b>${esc(r.ID)}</b>? Conserva su ID original y queda registrado como <b>Reimpreso</b>.</p>`, 'Reimprimir'))) return;
      try {
        await perm(ctx.dir());
        await append(await sub(ctx.dir()), regName(ctx.dev()), HEAD, [row(ctx, { op: r.Operacion, comp: r.Componente, linea: r.Linea, id: r.ID, pos: r.Posicion, lote: r.Lote, estado: 'Reimpreso' })]);
      } catch (e) { return ctx.toast('No se pudo registrar: ' + (e.message || e), 'err', 6000); }
      const [pos, total] = String(r.Posicion).split('/').map(Number);
      await runPrint([{ op: r.Operacion, comp: r.Componente, linea: r.Linea, id: r.ID, pos: pos || 1, total: total || 1, fecha: r.Fecha, hora: r.Hora }], C.logo);
      vHist(body, ctx, C, admin);
    }
    async function annul(k) {
      if (!ctx.isAdmin()) return ctx.toast('Solo el Administrador puede anular etiquetas.', 'warn');
      const r = find(k); if (!r) return;
      if (!(await ctx.confirm('Anular', `<p>¿Anular <b>${esc(r.ID)}</b>? Queda registrado y el ID <b>no se reutiliza</b>.</p>`, 'Anular'))) return;
      try { await perm(ctx.dir()); const b = one(r); await append(await sub(ctx.dir()), regName(ctx.dev()), HEAD, [row(ctx, { op: b.op, comp: b.comp, linea: b.linea, id: r.ID, pos: r.Posicion, lote: r.Lote, estado: 'Anulado', motivo: 'Anulado por Administrador' })]); ctx.toast(r.ID + ' anulado', 'ok'); }
      catch (e) { return ctx.toast('No se pudo anular: ' + (e.message || e), 'err', 6000); }
      vHist(body, ctx, C, admin);
    }
    $('#qxlQ').oninput = (e) => { V.q = e.target.value; draw(); };
    $('#qxlRe').onclick = () => vHist(body, ctx, C, admin);
    draw();
  }

  async function vCons(body, ctx, C) {
    const P = ctx.ui.panel;
    body.innerHTML = `<div class="${P}"><h2 class="qxl-h" style="margin-bottom:10px">Último ID por componente</h2><div class="qxl-tw"><table class="qxl-tbl"><thead><tr><th>Operación</th><th>Componente</th><th>Línea</th><th>Prefijo</th><th>Último ID</th><th>Próximo ID</th></tr></thead><tbody id="qxlCt"><tr><td colspan="6" class="qxl-muted">Cargando…</td></tr></tbody></table></div>
      <p class="qxl-muted">Validación y Devolución llevan un consecutivo por componente (Devolución con su propio prefijo); Secuencia, uno por componente y línea. Al llegar a 999 se pasa al siguiente prefijo (AA → AB).</p></div>`;
    let cons = [], rmax = {};
    try { const d = await sub(ctx.dir()); cons = await readCons(d); rmax = regMax(await loadAll(d)); } catch (e) {}
    const tr = (op, comp, lin, base) => { const cur = counterOf(cons, rmax, op, comp, lin, base); return `<tr><td>${op}</td><td>${esc(comp)}</td><td>${esc(lin || '—')}</td><td>${esc(cur.p)}</td><td><b>${cur.n ? formatId(cur.p, cur.n) : '—'}</b></td><td>${allocate(cur.p, cur.n, 1).ids[0]}</td></tr>`; };
    const seqKeys = new Set(); cons.filter((r) => r.Operacion === 'Secuencia').forEach((r) => seqKeys.add(`${r.Componente}|${r.Linea}`));
    Object.keys(rmax).filter((k) => k.startsWith('Secuencia|')).forEach((k) => { const [, c, l] = k.split('|'); seqKeys.add(`${c}|${l}`); });
    const base = (n) => (C.comps.find((c) => c.n === n) || {}).p || 'AA';
    body.querySelector('#qxlCt').innerHTML = C.comps.map((c) => tr('Validación', c.n, '', c.p)).join('') + C.comps.map((c) => tr('Devolución', c.n, '', c.pd)).join('') + [...seqKeys].sort().map((k) => { const [c, l] = k.split('|'); return tr('Secuencia', c, l, base(c)); }).join('');
  }

  G.QXLabels = { render, norm, DEF, reserve, reserveLinea, mark, fold, loadAll, regMax, counterOf, allocate, nextPrefix, formatId, code128, barcodeSVG, labelHTML, parseId, ord, _T: T, _V: V, DIRN, CONS };
})(typeof window !== 'undefined' ? window : globalThis);
