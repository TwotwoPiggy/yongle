<purpose>
鍩轰簬 SQLite 鐨勯珮鎬ц兘妫€绱㈠紩鎿庛€傛敮鎸佽仛鍚堟煡璇笌缁撴灉缇庡寲灞曠ず銆?</purpose>

<process>

**Step 1: 鍙傛暟瑙ｆ瀽**

1. 鎻愬彇 `$QUERY` (浣嶇疆鍙傛暟)銆?2. 璇嗗埆杩囨护鍣細
   - `--local`: 鍙煡璇㈠綋鍓嶉」鐩储寮曘€?   - `--global`: 鍙煡璇㈠叏灞€浠撳簱绱㈠紩銆?   - `--tag <tag>`: 鎸夋爣绛剧簿鍑?妯＄硦杩囨护銆?
---

**Step 2: 鏋勫缓鏌ヨ**

1. 瀹氫箟鍩虹 SQL锛?   ```sql
   SELECT id, date, resolution_type, cause_summary, tags, filepath, source 
   FROM entries 
   WHERE (cause_summary LIKE '%$QUERY%' OR id LIKE '%$QUERY%')
   ```
2. 濡傛灉鏈?`--tag`锛?   ```sql
   AND tags LIKE '%$TAG%'
   ```
3. 鎵ц鏌ヨ锛?   - 濡傛灉鏈寚瀹氳寖鍥达紝鍒嗗埆瀵?`local` 鍜?`global` 鎵ц鏌ヨ骞跺悎骞剁粨鏋溿€?   - 鍛戒护锛歚node yongle/scripts/yongle-db.js query <scope> "<SQL>"`

---

**Step 3: 缁撴灉灞曠ず**

1. 鏄剧ず妫€绱㈡í骞咃細
   ```
   鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹?    姘镐箰澶у吀 鈻?妫€绱㈢粨鏋?(鍏抽敭璇? "$QUERY")
   鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹?   ```
2. 浠?Markdown 琛ㄦ牸褰㈠紡灞曠ず鍛戒腑鏉＄洰锛?   - 瀛楁锛氭潵婧?(Source), 鏃ユ湡 (Date), ID, 鎽樿 (Summary)銆?3. 鎻愪緵蹇€熸墦寮€寤鸿锛?   - 鈥滄彁绀猴細浣犲彲浠ョ洿鎺ョ偣鍑讳互涓婇摼鎺ユ垨澶嶅埗璺緞鍒扮紪杈戝櫒棰勮銆傗€?
</process>

<notes>
- 妫€绱㈣繃绋嬩笉娑夊強鏂囦欢 IO锛堥櫎浜?DB 璁块棶锛夛紝鏋佸叿鎬ц兘浼樺娍銆?- `source` 瀛楁鍦ㄨ仛鍚堟悳绱㈡椂浣滀负绗竴鍒楀睍绀猴紝鍖哄垎 `[Local]` 涓?`[Global]`銆?</notes>

