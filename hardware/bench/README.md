# 开放台架 · 可打印连杆

开放台架可以用 [A4 定位图](../bench-jig.svg) 定位两舵机，轴心距 **25.00 mm**；舵机耳孔、底板支架和绘制屏位置按实物确定。图中的孔距与分支基于 [5.2.2 固件名义几何](../../firmware/JianClock/Geometry.h)，用于检查位置或制作名义平板连杆，不能作为打印网格尺寸表。

[整机打印包](../enclosure/README.md)包含以下四件机械臂，可先装在开放台架检查。

| 文件 | 用途 | STL 几何参考 |
| --- | --- | --- |
| [`07-active-arm-low.stl`](../enclosure/stl/07-active-arm-low.stl) | 低座主动臂 | 总高 6.25 mm，孔中心距约 35 mm |
| [`08-active-arm-high.stl`](../enclosure/stl/08-active-arm-high.stl) | 高座主动臂 | 总高 7.62 mm，孔中心距约 35 mm |
| [`09-right-follower-slotted.stl`](../enclosure/stl/09-right-follower-slotted.stl) | 两孔直槽随动杆 F–Q | 两端孔中心距约 45.01 mm |
| [`10-lamp-link-slotted.stl`](../enclosure/stl/10-lamp-link-slotted.stl) | 带斜槽和灯头座的三孔连杆 | E–P 约 53.55、E–Q 约 45.01、P–Q 约 13.02 mm |

1. 按毫米、100% 比例切片。按[逐层预览要点](../enclosure/README.md#切片和配合)检查槽与孔，先试打一件。试穿实际螺钉、舵盘和灯珠，再确定需要的支撑、紧固件与间隙。表中总高是摆放后的整体网格高度，包括舵盘座。
2. 先用实际舵盘试配主动臂，检查防转固定、前盖净空和关节错层；高低座本身不指定左右。用垫片调节时，确保关节顺滑且连杆和螺钉不刮外壳。
3. 按 [台架模板](../bench-jig.svg) 核对分支。从正面沿 E→P 方向看，Q 在其右侧；勿镜像。按[分步调试](../commissioning.md)完成灭灯空走，在绘制面中部和近边缘实测小方框，填写[实机验证记录](../validation-record.md)。

表中尺寸为 STL 网格上的近似值。固件按左主动臂 33.35 mm、右主动臂 34.85 mm 等名义几何计算；实机校准可调舵机零点和比例，不能校正所有由连杆尺寸导致的轨迹误差。尚未针对这套打印件做实体试装或全行程验收。
