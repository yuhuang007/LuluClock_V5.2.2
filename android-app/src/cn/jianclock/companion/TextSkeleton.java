package cn.jianclock.companion;
import java.util.*;
/** Raster medial strokes, not font outlines. Each skeleton edge is emitted once. */
final class TextSkeleton {
 static final int[] DX={0,1,1,1,0,-1,-1,-1},DY={-1,-1,0,1,1,1,0,-1};
 static List<int[]> trace(boolean[] input,int w,int h){
  if(w<3||h<3||input.length!=w*h)throw new IllegalArgumentException();
  boolean[] p=input.clone(),remove=new boolean[p.length];boolean changed;
  do{changed=false;for(int phase=0;phase<2;phase++){
   Arrays.fill(remove,false);
   for(int y=1;y<h-1;y++)for(int x=1;x<w-1;x++){
    int i=y*w+x;if(!p[i])continue;boolean[] n=new boolean[8];int count=0,trans=0;
    for(int k=0;k<8;k++){n[k]=p[i+DY[k]*w+DX[k]];if(n[k])count++;}
    for(int k=0;k<8;k++)if(!n[k]&&n[(k+1)%8])trans++;
    if(count<2||count>6||trans!=1)continue;
    boolean a=phase==0?n[0]&&n[2]&&n[4]:n[0]&&n[2]&&n[6];
    boolean b=phase==0?n[2]&&n[4]&&n[6]:n[0]&&n[4]&&n[6];
    if(!a&&!b)remove[i]=true;
   }
   for(int i=0;i<p.length;i++)if(remove[i]){p[i]=false;changed=true;}
  }}while(changed);
  int[] links=new int[p.length],used=new int[p.length];
  for(int y=1;y<h-1;y++)for(int x=1;x<w-1;x++){
   int i=y*w+x;if(!p[i])continue;
   for(int k=0;k<8;k++){
    int dx=DX[k],dy=DY[k];if(!p[i+dy*w+dx])continue;
    // A diagonal across a square corner duplicates two orthogonal edges.
    if(dx!=0&&dy!=0&&(p[i+dx]||p[i+dy*w]))continue;
    links[i]|=1<<k;
   }
  }
  List<int[]> paths=new ArrayList<>();
  for(int pass=0;pass<2;pass++)for(int i=0;i<p.length;i++){
   if(!p[i]||(pass==0&&Integer.bitCount(links[i])==2))continue;
   for(int k=0;k<8;k++)if((links[i]&(1<<k))!=0&&(used[i]&(1<<k))==0){
    List<Integer> points=new ArrayList<>();int at=i,dir=k;points.add(at);
    while(true){
     used[at]|=1<<dir;int next=at+DY[dir]*w+DX[dir];used[next]|=1<<((dir+4)%8);points.add(next);at=next;
     if(at==i||Integer.bitCount(links[at])!=2)break;
     int remaining=links[at]&~used[at];if(remaining==0)break;dir=Integer.numberOfTrailingZeros(remaining);
    }
    int[] path=new int[points.size()];for(int j=0;j<path.length;j++)path[j]=points.get(j);paths.add(path);
   }
   // Dots must remain visible: a short single lit segment rather than a contour.
   if(pass==0&&links[i]==0)paths.add(new int[]{i,i});
  }
  return paths;
 }
}
