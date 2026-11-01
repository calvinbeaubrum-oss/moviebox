import ghidra.app.script.GhidraScript;
import ghidra.app.decompiler.*;
import ghidra.program.model.listing.*;
import ghidra.program.model.address.*;
import ghidra.program.model.symbol.*;
import java.io.*;
import java.util.*;

public class DecompDump extends GhidraScript {
    private Function ensureFunction(Address a){
        Function f = getFunctionAt(a);
        if (f!=null) return f;
        f = getFunctionContaining(a);
        if (f!=null) return f;
        disassemble(a);
        return createFunction(a, "SUB_"+a);
    }
    public void run() throws Exception {
        String[] args = getScriptArgs();
        String outPath = args[0];
        int depthLimit = 3;
        Map<Address,Integer> depth = new HashMap<>();
        LinkedHashSet<Address> todo = new LinkedHashSet<>();
        Set<Address> done = new HashSet<>();
        AddressSpace as = currentProgram.getAddressFactory().getDefaultAddressSpace();
        Address base = currentProgram.getImageBase();
        for (int i=1;i<args.length;i++){
            Address a = base.add(Long.parseLong(args[i],16));
            todo.add(a); depth.put(a,0);
        }
        DecompInterface di = new DecompInterface();
        di.setOptions(new DecompileOptions());
        di.openProgram(currentProgram);
        PrintWriter pw = new PrintWriter(new BufferedWriter(new FileWriter(outPath)));
        while(!todo.isEmpty()){
            Address a = todo.iterator().next(); todo.remove(a);
            if (done.contains(a)) continue;
            done.add(a);
            int d = depth.getOrDefault(a,0);
            Function f = ensureFunction(a);
            if (f==null){ pw.println("// pas de fonction a "+a); continue; }
            DecompileResults res = di.decompileFunction(f, 180, monitor);
            if (res.decompileCompleted()){
                pw.println("// ==== "+f.getName()+" @ "+f.getEntryPoint()+" (depth "+d+") ====");
                pw.println(res.getDecompiledFunction().getC());
            } else {
                pw.println("// ECHEC "+f.getName()+" @ "+f.getEntryPoint()+" : "+res.getErrorMessage());
            }
            if (d < depthLimit){
                for (Function c : f.getCalledFunctions(monitor)) {
                    Address ep = c.getEntryPoint();
                    if (ep!=null && !done.contains(ep) && todo.size()<400){
                        todo.add(ep);
                        if (!depth.containsKey(ep)||depth.get(ep)>d+1) depth.put(ep,d+1);
                    }
                }
            }
        }
        pw.close(); di.dispose();
        println("Dump ecrit dans "+outPath+" ("+done.size()+" fonctions)");
    }
}
