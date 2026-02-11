// ================================================
//
// SPDX-FileCopyrightText: 2025 Stefan Warnke
//
// SPDX-License-Identifier: BeerWare
//
//=================================================

//#define TEST_LOGIC_GATES
//#define TEST_HCT161
//#define TEST_DECODER
//#define TEST_MULTIPLEXER
//#define TEST_BUFFERS_REGISTERS
//#define TEST_EPROM1
//#define TEST_EPROM2
//#define TEST_RAM1
//#define TEST_RAM2
//#define TEST_LABEL_AND_BUS
//#define TEST_DIODE_AND
//#define TEST_ADDER
//#define TEST_BIDIR_BUFFER
//#define TEST_LM555
//#define RC_LP_HP
//#define TEST_GALS
//#define TEST_RES_NETWORK
//#define TEST_HCT173
#define TEST_ALU


using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SimBase;
using ChipLibrary;
using System.Windows.Forms;

namespace Schematics
{
    /// <summary>
    /// A test schematics class for testing out any new component or component group.
    /// </summary>
    public class TestSchematics:BaseSchematics
    {
        public const string SCHEMATICS_NAME = "Test";

#if TEST_LOGIC_GATES
        private ClockGenerator CLK1;
        private ClockGenerator CLK2;
        private ClockGenerator CLK3;
        private ClockGenerator CLK4;
        private ClockGenerator CLK5;
        private ClockGenerator CLK6;
        private ClockGenerator CLK7;
        private ClockGenerator CLK8;
#endif

#if TEST_HCT161
        private ClockGenerator CLK0;
        private ResetGenerator RST;
        private PatternGenerator PG;
#endif

#if TEST_DECODER
        private CountGenerator CG;
#endif
#if TEST_MULTIPLEXER
        private CountGenerator CG;
#endif

#if TEST_BUFFERS_REGISTERS
        private ClockGenerator CLK0;
        private ResetGenerator RST;
        private CountGenerator CG;
#endif

#if TEST_EPROM1 || TEST_EPROM2
        private CountGenerator CG;
#if TEST_EPROM1
        private AT28C16 EPROM;
#else
        private AT27C1024 EPROM;
#endif
#endif

#if TEST_RAM1 || TEST_RAM2
        private CountGenerator CG;
        private HCT10 Nand;
        private HCT74 DFF;
#if TEST_RAM1
        private F189 RAM;
#else
        private HCT240 Buffer;
        private HM62256 RAM;
#endif
#endif

#if TEST_LABEL_AND_BUS
        private CountGenerator CG;
        private SignalLabel LB;
        private SignalBus BUS;
#endif

#if TEST_DIODE_AND
        private CountGenerator CG;
        private DiodeAND DA1;
        private DiodeAND DA2;
        private DiodeAND DA3;
        private SignalBus BUS;
        private DiodeAND DA4;
        private DiodeAND DA5;
        private DiodeAND DA6;
        private HCT00 U1;
        private SignalLabel Label;
#endif

#if TEST_ADDER
        private CountGenerator CG;
        private HCT283 ADD;
#endif

#if TEST_BIDIR_BUFFER
        private CountGenerator CG;
        private HCT04 Inv;
        private HCT245 Buffer0;
        private HCT245 Buffer1;
        private HCT245 Buffer2;
#endif

#if TEST_LM555
         private LM555 LM555;
        private RC_HP RCHP;

#endif

#if RC_LP_HP
        private ClockGenerator CLK;
        private RC_HP HP;
        private RC_LP LP;
#endif

#if TEST_GALS
        private CountGenerator CG;
        private GAL16V8 GAL16V8;
        private GAL22V10 GAL22V10;
#endif

#if TEST_RES_NETWORK
        private CountGenerator CG;
        private HCT245 Buffer1;
        private HCT245 Buffer2;
        private ResistorNetwork RN;
#endif
#if TEST_HCT173
        private CountGenerator CG;
        private ResetGenerator RST;
        private ResistorNetwork RN;
        private HCT173 Reg;
        private HCT245 Buffer;

#endif

#if TEST_ALU
        private CountGenerator CG;
        private LS181 ALU0;
        private Resistor R1;
#endif
        public TestSchematics() : base(SCHEMATICS_NAME)
        {

#if TEST_LOGIC_GATES
            Elements.Add(CLK1 = new ClockGenerator("CLK1", SignalState.L, 1000, 0));
            Elements.Add(CLK2 = new ClockGenerator("CLK2", SignalState.L, 1000, -100));
            Elements.Add(CLK3 = new ClockGenerator("CLK3", SignalState.L, 1000, -200));
            Elements.Add(CLK4 = new ClockGenerator("CLK4", SignalState.L, 1000, -300));
            Elements.Add(CLK5 = new ClockGenerator("CLK5", SignalState.L, 1000, -400));
            Elements.Add(CLK6 = new ClockGenerator("CLK6", SignalState.L, 1000, -500));
            Elements.Add(CLK7 = new ClockGenerator("CLK7", SignalState.L, 1000, -600));
            Elements.Add(CLK8 = new ClockGenerator("CLK8", SignalState.L, 1000, -700));

            Net net1 = new Net(CLK1.Out);
            Net net2 = new Net(CLK2.Out);
            Net net3 = new Net(CLK3.Out);
            Net net4 = new Net(CLK4.Out);
            Net net5 = new Net(CLK5.Out);
            Net net6 = new Net(CLK6.Out);
            Net net7 = new Net(CLK7.Out);
            Net net8 = new Net(CLK8.Out);

            Elements.Add(new HCT00("U1.HCT00", net1, net2, net3, net4, net5, net6, net7, net8));
            Elements.Add(new HCT02("U2.HCT02", net1, net2, net3, net4, net5, net6, net7, net8));
            Elements.Add(new HCT32("U3.HCT32", net1, net2, net3, net4, net5, net6, net7, net8));
            Elements.Add(new HCT86("U4.HCT86", net1, net2, net3, net4, net5, net6, net7, net8));
            Elements.Add(new HCT04("U5.HCT04", net1, net2, net3, net4, net5, net6));
#endif
#if TEST_HCT161
            Elements.Add(CLK0 = new ClockGenerator("CLK0", SignalState.L, 100, 0));
            Elements.Add(RST = new ResetGenerator("RST", 500));
            Elements.Add(PG = new PatternGenerator("PG", 7, new PatternEntry[] {
                new PatternEntry(0,    new SignalState[] {SignalState.H, SignalState.L, SignalState.L, SignalState.L, SignalState.L, SignalState.L, SignalState.L }),
                new PatternEntry(1050, new SignalState[] {SignalState.H, SignalState.L, SignalState.L, SignalState.L, SignalState.L, SignalState.L, SignalState.L }),
                new PatternEntry(1250, new SignalState[] {SignalState.L, SignalState.L, SignalState.L, SignalState.L, SignalState.L, SignalState.H, SignalState.H }),
                new PatternEntry(1450, new SignalState[] {SignalState.H, SignalState.H, SignalState.L, SignalState.L, SignalState.L, SignalState.H, SignalState.H }),
                new PatternEntry(1650, new SignalState[] {SignalState.H, SignalState.H, SignalState.H, SignalState.L, SignalState.L, SignalState.H, SignalState.H }),
                new PatternEntry(1850, new SignalState[] {SignalState.H, SignalState.H, SignalState.H, SignalState.L, SignalState.L, SignalState.H, SignalState.H })} ));
            Elements.Add(new HCT161("U1", new Net(CLK0.Out), new Net(RST.Outn), new Net(PG.Out[0]), new Net(PG.Out[1]), new Net(PG.Out[2]), new Net(PG.Out[3]), new Net(PG.Out[4]), new Net(PG.Out[5]), new Net(PG.Out[6])));
#endif

#if TEST_DECODER
            Elements.Add(CG = new CountGenerator("CG", 6, 75, 0x0F));
            Net net0 = new Net(CG.Out[0]);
            Net net1 = new Net(CG.Out[1]);
            Net net2 = new Net(CG.Out[2]);
            Net net3 = new Net(CG.Out[3]);
            Net net4 = new Net(CG.Out[4]);
            Net net5 = new Net(CG.Out[5]);

            Elements.Add(new HCT138("U1.HCT138", net3, net4, net5, net0, net1, net2));
            Elements.Add(new HCT139("U1.HCT139", net3, net4, net5, net0, net1, net2));
#endif

#if TEST_MULTIPLEXER
            Elements.Add(CG = new CountGenerator("CG", 12, 50, 0));
            Net net0 = new Net(CG.Out[0]);
            Net net1 = new Net(CG.Out[1]);
            Net net2 = new Net(CG.Out[2]);
            Net net3 = new Net(CG.Out[3]);
            Net net4 = new Net(CG.Out[4]);
            Net net5 = new Net(CG.Out[5]);
            Net net6 = new Net(CG.Out[6]);
            Net net7 = new Net(CG.Out[7]);
            Net net8 = new Net(CG.Out[8]);
            Net net9 = new Net(CG.Out[9]);
            Net net10 = new Net(CG.Out[10]);
            Net net11 = new Net(CG.Out[11]);

            Elements.Add(new HCT153("U1.HCT153", net10, net11, net0, net1, net2, net3, net4, net5, net6, net7, net8, net9));
            Elements.Add(new HCT157("U2.HCT157", net10, net11, net0, net1, net2, net3, net4, net5, net6, net7));

#endif

#if TEST_BUFFERS_REGISTERS
            Elements.Add(CLK0 = new ClockGenerator("CLK0", SignalState.L, 55, 0));
            Elements.Add(RST = new ResetGenerator("RST", 500));
            Elements.Add(CG = new CountGenerator("CG", 10, 70, 0));
            Net netClk = new Net(CLK0.Out);
            Net netRst = new Net(RST.Outn);

            Net net0 = new Net(CG.Out[0]);
            Net net1 = new Net(CG.Out[1]);
            Net net2 = new Net(CG.Out[2]);
            Net net3 = new Net(CG.Out[3]);
            Net net4 = new Net(CG.Out[4]);
            Net net5 = new Net(CG.Out[5]);
            Net net6 = new Net(CG.Out[6]);
            Net net7 = new Net(CG.Out[7]);
            Net net8 = new Net(CG.Out[8]);
            Net net9 = new Net(CG.Out[9]);

            Elements.Add(new HCT240("U1.HCT240", net8, net0, net1, net2, net3, net9, net4, net5, net6, net7));
            Elements.Add(new HCT244("U2.HCT244", net8, net0, net1, net2, net3, net9, net4, net5, net6, net7));
            Elements.Add(new HCT273("U3.HCT273", netClk, netRst, net0, net1, net2, net3, net4, net5, net6, net7));
            Elements.Add(new HCT377("U4.HCT377", netClk, net8, net0, net1, net2, net3, net4, net5, net6, net7));
#endif

#if TEST_EPROM1 || TEST_EPROM2
            Net L = new Net("L");
            LogicLevel.L.ConnectedNet = L;
            Net H = new Net("H");
            LogicLevel.H.ConnectedNet = H;

            Elements.Add(CG = new CountGenerator("CG", 18, 200, 0));
#if TEST_EPROM1
            Elements.Add(EPROM = new AT28C16("U1", H, new Net(CG.Out[1]), new Net(CG.Out[2]),new Net(CG.Out[3]), new Net(CG.Out[4]), new Net(CG.Out[5]), new Net(CG.Out[6]), new Net(CG.Out[7]), new Net(CG.Out[8]), new Net(CG.Out[9]), new Net(CG.Out[10]), new Net(CG.Out[11]), new Net(CG.Out[12]), new Net(CG.Out[13])));
#else
            Elements.Add(EPROM = new AT27C1024("U1", H, new Net(CG.Out[0]), new Net(CG.Out[1]), new Net(CG.Out[2]), new Net(CG.Out[3]), new Net(CG.Out[4]), new Net(CG.Out[5]), new Net(CG.Out[6]), new Net(CG.Out[7]), new Net(CG.Out[8]), new Net(CG.Out[9]), new Net(CG.Out[10]), new Net(CG.Out[11]), new Net(CG.Out[12]), new Net(CG.Out[13]), new Net(CG.Out[14]), new Net(CG.Out[15]), new Net(CG.Out[16]), new Net(CG.Out[17])));
#endif
#endif

#if TEST_RAM1 || TEST_RAM2
            Net L = new Net("L");
            LogicLevel.L.ConnectedNet = L;
            Net H = new Net("H");
            LogicLevel.H.ConnectedNet = H;
            Elements.Add(CG = new CountGenerator("CG", 18, 250, 0x33AA));

            Net net0 = new Net(CG.Out[0]);     Net netn0 = new Net(CG.Outn[0]);
            Net net1 = new Net(CG.Out[1]);     Net netn1 = new Net(CG.Outn[1]);
            Net net2 = new Net(CG.Out[2]);     Net netn2 = new Net(CG.Outn[2]);
            Net net3 = new Net(CG.Out[3]);     Net netn3 = new Net(CG.Outn[3]);
            Net net4 = new Net(CG.Out[4]);     Net netn4 = new Net(CG.Outn[4]);
            Net net5 = new Net(CG.Out[5]);     Net netn5 = new Net(CG.Outn[5]);
            Net net6 = new Net(CG.Out[6]);     Net netn6 = new Net(CG.Outn[6]); 
            Net net7 = new Net(CG.Out[7]);     Net netn7 = new Net(CG.Outn[7]);
            Net net8 = new Net(CG.Out[8]);     Net netn8 = new Net(CG.Outn[8]);
            Net net9 = new Net(CG.Out[9]);     Net netn9 = new Net(CG.Outn[9]);
            Net net10 = new Net(CG.Out[10]);   Net netn10 = new Net(CG.Outn[10]);
            Net net11 = new Net(CG.Out[11]);   Net netn11 = new Net(CG.Outn[11]);
            Net net12 = new Net(CG.Out[12]);   Net netn12 = new Net(CG.Outn[12]);
            Net net13 = new Net(CG.Out[13]);   Net netn13 = new Net(CG.Outn[13]);
            Net net14 = new Net(CG.Out[14]);   Net netn14 = new Net(CG.Outn[14]);
            Net net15 = new Net(CG.Out[15]);   Net netn15 = new Net(CG.Outn[15]);
            Net net16 = new Net(CG.Out[16]);   Net netn16 = new Net(CG.Outn[16]);
            Net net17 = new Net(CG.Out[17]);   Net netn17 = new Net(CG.Outn[17]);

            Elements.Add(DFF = new HCT74("DFF", net0, H, null, H, L, H, L, L));
            Elements.Add(Nand = new HCT10("Nand", netn0, netn1, netn2, net0, net1, net1, net0, new Net(DFF.Q1), netn1));
            DFF.CLR1n.ConnectedNet = new Net(Nand.O1Y);

#if TEST_RAM1

            Elements.Add(RAM = new F189("RAM", new Net(Nand.O3Y), netn0, net3, net4, net5, net4, net5, net6, net7, net8));

#else
            Net netNandO2Y = new Net(Nand.O2Y);
            Net netNandO3Y = new Net(Nand.O3Y);

            Elements.Add(RAM = new HM62256("U1.HM62256", netNandO3Y, netn0, netNandO2Y, net3, net4, net5, net6, net7, net8, net9, net10, net11, net12, net13, net14, net15, net16, net17, null,null,null,null, null, null, null, null));
            Elements.Add(Buffer = new HCT240("U2.HCT240", netNandO3Y, net10, net9, net8, net7, netNandO3Y, net6, net5, net4, net3));
            RAM.IO0.ConnectedNet = new Net(Buffer.O1Y0);
            RAM.IO1.ConnectedNet = new Net(Buffer.O1Y1);
            RAM.IO2.ConnectedNet = new Net(Buffer.O1Y2);
            RAM.IO3.ConnectedNet = new Net(Buffer.O1Y3);
            RAM.IO4.ConnectedNet = new Net(Buffer.O2Y0);
            RAM.IO5.ConnectedNet = new Net(Buffer.O2Y1);
            RAM.IO6.ConnectedNet = new Net(Buffer.O2Y2);
            RAM.IO7.ConnectedNet = new Net(Buffer.O2Y3);

#endif
#endif

#if TEST_LABEL_AND_BUS
            Elements.Add(CG = new CountGenerator("CG", 8, 100, 0x0));
            Net net0 = new Net(CG.Out[0]);
            Net net1 = new Net(CG.Out[1]);
            Net net2 = new Net(CG.Out[2]);
            Net net3 = new Net(CG.Out[3]);
            Net net4 = new Net(CG.Out[4]);
            Net net5 = new Net(CG.Out[5]);
            Net net6 = new Net(CG.Out[6]);
            Net net7 = new Net(CG.Out[7]);

            Elements.Add(LB = new SignalLabel("Label", net0));
            Elements.Add(BUS = new SignalBus("BUS", new Net[] { net0, net1, net2, net3, net4, net5, net6, net7  }));

#endif


#if TEST_DIODE_AND
            Elements.Add(CG = new CountGenerator("CG", 8, 100, 0x0));
            Net net0 = new Net(CG.Out[0]);
            Net net1 = new Net(CG.Out[1]);
            Net net2 = new Net(CG.Out[2]);
            Net net3 = new Net(CG.Out[3]);
            Net net4 = new Net(CG.Out[4]);
            Net net5 = new Net(CG.Out[5]);
            Net net6 = new Net(CG.Out[6]);
            Net net7 = new Net(CG.Out[7]);

            Elements.Add(DA1 = new DiodeAND("AND1", new Net[] { net0, net1 }));
            Elements.Add(DA2 = new DiodeAND("AND2", new Net[] { net1, net2, net5 }));
            Elements.Add(DA3 = new DiodeAND("AND3", new Net[] { net4, net5, net6 }));
            Elements.Add(BUS = new SignalBus("BUS",new Net[] { net0, net1, net2, net3, net4, net5, net6, net7 }));

            Elements.Add(DA4 = new DiodeAND("AND4", new Net[] { BUS[0], BUS[1] }));
            //Elements.Add(U1 = new HCT00("U1", BUS[0], BUS[1], BUS[0], BUS[1], BUS[0], BUS[1], BUS[0], BUS[1]));
            Elements.Add(DA5 = new DiodeAND("AND5", new Net[] { BUS[1], BUS[2], BUS[5] }));
            Elements.Add(DA6 = new DiodeAND("AND6", new Net[] { BUS[4], BUS[5], BUS[6] }));

            Elements.Add(Label = new SignalLabel("BUS0", BUS[0]));
#endif

#if TEST_ADDER
            Elements.Add(CG = new CountGenerator("CG", 9, 100, 0x0));
            Net net0 = new Net(CG.Out[0]); 
            Net net1 = new Net(CG.Out[1]); 
            Net net2 = new Net(CG.Out[2]); 
            Net net3 = new Net(CG.Out[3]); 
            Net net4 = new Net(CG.Out[4]); 
            Net net5 = new Net(CG.Out[5]); 
            Net net6 = new Net(CG.Out[6]); 
            Net net7 = new Net(CG.Out[7]); 
            Net net8 = new Net(CG.Out[8]); 

            Elements.Add(ADD = new HCT283("ADD", net4, net0, net1, net2, net3, net5, net6, net7, net8));

#endif

#if TEST_BIDIR_BUFFER
            Net L = new Net("L");
            LogicLevel.L.ConnectedNet = L;
            Net H = new Net("H");
            LogicLevel.H.ConnectedNet = H;
            Elements.Add(CG = new CountGenerator("CG", 10, 100, 0x0));
            Net net0 = new Net(CG.Out[0]);
            Net net1 = new Net(CG.Out[1]);
            Net net2 = new Net(CG.Out[2]);
            Net net3 = new Net(CG.Out[3]);
            Net net4 = new Net(CG.Out[4]); Net netn4 = new Net(CG.Outn[4]);
            Net net5 = new Net(CG.Out[5]);
            Net net6 = new Net(CG.Out[6]);
            Net net7 = new Net(CG.Out[7]);
            Net net8 = new Net(CG.Out[8]);
            Net net9 = new Net(CG.Out[9]);

            Elements.Add(Buffer0 = new HCT245("Buf0", H, net4, net0, net1, net2, net3, net4, net5, net6, net7));
            Elements.Add(Buffer1 = new HCT245("Buf1", H, netn4, net0, net1, net2, net3, net4, net5, net6, net7));
            Elements.Add(Buffer2 = new HCT245("Buf2", netn4, L, new Net(Buffer0.B0), new Net(Buffer0.B1), new Net(Buffer0.B2), new Net(Buffer0.B3), new Net(Buffer0.B4), new Net(Buffer0.B5), new Net(Buffer0.B6), new Net(Buffer0.B7)));
            Buffer2.B0.ConnectedNet = new Net(Buffer1.B0);
            Buffer2.B1.ConnectedNet = new Net(Buffer1.B1);
            Buffer2.B2.ConnectedNet = new Net(Buffer1.B2);
            Buffer2.B3.ConnectedNet = new Net(Buffer1.B3);
            Buffer2.B4.ConnectedNet = new Net(Buffer1.B4);
            Buffer2.B5.ConnectedNet = new Net(Buffer1.B5);
            Buffer2.B6.ConnectedNet = new Net(Buffer1.B6);
            Buffer2.B7.ConnectedNet = new Net(Buffer1.B7);

#endif

#if TEST_LM555
            Net H = new Net("H");
            LogicLevel.H.ConnectedNet = H;
            //Elements.Add(new LM555("LM555", H, H, 5.0, 3.9e3, 3e3, 0.01e-6));
            Elements.Add(LM555 = new LM555("LM555", H, H, 5.0, 1e3, 1e3, 1e-9));
            Elements.Add(RCHP = new RC_HP("RCHP", new Net(LM555.Q), 0.01e-6, 0.1e3));
#endif

#if RC_LP_HP
            Net H = new Net("H");
            LogicLevel.H.ConnectedNet = H;
            Elements.Add(CLK = new ClockGenerator("CLK", SignalState.L, 80, 0));
            Elements.Add(HP = new RC_HP("HP", new Net(CLK.Out), 47e-12, 1500));
            Elements.Add(LP = new RC_LP("LP",H, 1000, 0.1e-6));
#endif


#if TEST_GALS
            Net L = new Net("L");
            LogicLevel.L.ConnectedNet = L;
            Net H = new Net("H");
            LogicLevel.H.ConnectedNet = H;
            Elements.Add(CG = new CountGenerator("CG", 12, 50, 0x0));
            Net net0  = new Net(CG.Out[0]); 
            Net net1  = new Net(CG.Out[1]); 
            Net net2  = new Net(CG.Out[2]); 
            Net net3  = new Net(CG.Out[3]); 
            Net net4  = new Net(CG.Out[4]); 
            Net net5  = new Net(CG.Out[5]); 
            Net net6  = new Net(CG.Out[6]); 
            Net net7  = new Net(CG.Out[7]); 
            Net net8  = new Net(CG.Out[8]); 
            Net net9  = new Net(CG.Out[9]); 
            Net net10 = new Net(CG.Out[10]);
            Net net11 = new Net(CG.Out[11]);

            Elements.Add(GAL16V8 = new GAL16V8("16V8", net0, net1, net2, net9, net8, net7, net6, net5, net4, net3));
            GAL16V8.LoadContents(Application.StartupPath + "\\C64MemGAL.jed");
            Elements.Add(new SignalBus("P", new Net[] { net1, net2, net3 }));
            Elements.Add(new SignalBus("AB_H", new Net[] { L, L, net9, net8, net7, net6, net5, net4 }));
            Elements.Add(new SignalLabel("/CS_RAML", new Net(GAL16V8.IO1)));
            Elements.Add(new SignalLabel("/CS_RAMH", new Net(GAL16V8.IO2)));
            Elements.Add(new SignalLabel("/CS_ROM",  new Net(GAL16V8.IO3)));
            Elements.Add(new SignalLabel("/CS_IO",   new Net(GAL16V8.IO4)));
            Elements.Add(new SignalLabel("/CS_VIC",  new Net(GAL16V8.IO5)));
            Elements.Add(new SignalLabel("/CS_SID",  new Net(GAL16V8.IO6)));
            Elements.Add(new SignalLabel("/CS_CRAM", new Net(GAL16V8.IO7)));
            Elements.Add(new SignalLabel("/CS_EXT",  new Net(GAL16V8.IO8)));

            Elements.Add(GAL22V10 = new GAL22V10("22V10", net0, net1, net2, net3, net4, net5, net6, net7, net8, net9, L, net10));
            GAL22V10.LoadContents(Application.StartupPath + "\\ALUdecoder.jed");
            Elements.Add(new SignalBus("AddrIn", new Net[] { net2, net3, net4, net5 }));
            Elements.Add(new SignalLabel("CyIn", net10));
            Elements.Add(new SignalBus("AluIn", new Net[] { net6, net7, net8, net9 }));
            Elements.Add(new SignalBus("AddrOut", new Net[] { new Net(GAL22V10.IO1), new Net(GAL22V10.IO2), new Net(GAL22V10.IO3), new Net(GAL22V10.IO4) }));
            Elements.Add(new SignalLabel("CyOut", new Net(GAL22V10.IO10)));
            Elements.Add(new SignalBus("AluOut", new Net[] { new Net(GAL22V10.IO5), new Net(GAL22V10.IO6), new Net(GAL22V10.IO7), new Net(GAL22V10.IO8), new Net(GAL22V10.IO9) }));

#endif

#if TEST_RES_NETWORK
            Net L = new Net("L");
            LogicLevel.L.ConnectedNet = L;
            Net H = new Net("H");
            LogicLevel.H.ConnectedNet = H;
            Elements.Add(CG = new CountGenerator("CG", 12, 50, 0x0));
            Net net0 = new Net(CG.Out[0]);
            Net net1 = new Net(CG.Out[1]);
            Net net2 = new Net(CG.Out[2]);
            Net net3 = new Net(CG.Out[3]);
            Net net4 = new Net(CG.Out[4]);
            Net net5 = new Net(CG.Out[5]);
            Net net6 = new Net(CG.Out[6]);
            Net net7 = new Net(CG.Out[7]);
            Net net8 = new Net(CG.Out[8]);
            Net net9 = new Net(CG.Out[9]);
            Net net10 = new Net(CG.Out[10]);
            Net net11 = new Net(CG.Out[11]);

            Elements.Add(Buffer1 = new HCT245("Buf1", H, net4, net0, net1, net2, net3, net4, net5, net6, net7));
            Elements.Add(RN = new ResistorNetwork("RN", 8, true));
            RN.Passive[0].ConnectedNet = H;
            Net netR0 = new Net(new Pin[] { Buffer1.B0, RN.Passive[1] });
            Net netR1 = new Net(new Pin[] { Buffer1.B1, RN.Passive[2] });
            Net netR2 = new Net(new Pin[] { Buffer1.B2, RN.Passive[3] });
            Net netR3 = new Net(new Pin[] { Buffer1.B3, RN.Passive[4] });
            Net netR4 = new Net(new Pin[] { Buffer1.B4, RN.Passive[5] });
            Net netR5 = new Net(new Pin[] { Buffer1.B5, RN.Passive[6] });
            Net netR6 = new Net(new Pin[] { Buffer1.B6, RN.Passive[7] });
            Net netR7 = new Net(new Pin[] { Buffer1.B7, RN.Passive[8] });

            Elements.Add(Buffer2 = new HCT245("Buf2", H, L, netR0, netR1, netR2, netR3, netR4, netR5, netR6, netR7));

#endif
#if TEST_HCT173
            Net L = new Net("L");
            LogicLevel.L.ConnectedNet = L;
            Net H = new Net("H");
            LogicLevel.H.ConnectedNet = H;
            Elements.Add(RST = new ResetGenerator("RST", 500));
            Elements.Add(CG = new CountGenerator("CG", 12, 50, 0x0));
            Net net0 = new Net(CG.Out[0]);
            Net net1 = new Net(CG.Out[1]);
            Net net2 = new Net(CG.Out[2]);
            Net net3 = new Net(CG.Out[3]);
            Net net4 = new Net(CG.Out[4]);
            Net net5 = new Net(CG.Out[5]);
            Net net6 = new Net(CG.Out[6]);
            Net net7 = new Net(CG.Out[7]);
            Net net8 = new Net(CG.Out[8]);
            Net net9 = new Net(CG.Out[9]);
            Net net10 = new Net(CG.Out[10]);
            Net net11 = new Net(CG.Out[11]);

            Elements.Add(Reg = new HCT173("Reg", net0, new Net(RST.Out), net5, L, L, L, net6, net7, net8, net9));
            Elements.Add(RN = new ResistorNetwork("RN", 8, true));
            RN.Passive[0].ConnectedNet = H;
            Net netR0 = new Net(new Pin[] { Reg.Q0, RN.Passive[1] });
            Net netR1 = new Net(new Pin[] { Reg.Q1, RN.Passive[2] });
            Net netR2 = new Net(new Pin[] { Reg.Q2, RN.Passive[3] });
            Net netR3 = new Net(new Pin[] { Reg.Q3, RN.Passive[4] });
            Net netR4 = new Net(new Pin[] { RN.Passive[5] });
            Net netR5 = new Net(new Pin[] { RN.Passive[6] });
            Net netR6 = new Net(new Pin[] { RN.Passive[7] });
            Net netR7 = new Net(new Pin[] { RN.Passive[8] });
            Elements.Add(new SignalBus("BusIn", new Net[] { netR0, netR1, netR2, netR3, netR4, netR5, netR6, netR7 }));

            Elements.Add(Buffer = new HCT245("Buf", H, L, netR0, netR1, netR2, netR3, netR4, netR5, netR6, netR7));
#endif

#if TEST_ALU
            Net H = new Net("H");
            LogicLevel.H.ConnectedNet = H;
            Elements.Add(CG = new CountGenerator("CG", 14, 500, 0x0));
            Net netCin = new Net(CG.Out[0]);
            Net netA0 =  new Net(CG.Out[1]);
            Net netA1 =  new Net(CG.Out[2]);
            Net netA2 =  new Net(CG.Out[3]);
            Net netA3 =  new Net(CG.Out[4]);

            Net netB0 =  new Net(CG.Out[5]);
            Net netB1 =  new Net(CG.Out[6]);
            Net netB2 =  new Net(CG.Out[7]);
            Net netB3 =  new Net(CG.Out[8]);

            Net netS0 =  new Net(CG.Out[9]);
            Net netS1 =  new Net(CG.Out[10]);
            Net netS2 =  new Net(CG.Out[11]);
            Net netS3 =  new Net(CG.Out[12]);
            Net netM  =  new Net(CG.Out[13]);

            Elements.Add(ALU0 = new LS181("ALU0", netCin, netA0, netA1, netA2, netA3, netB0, netB1, netB2, netB3, netS0, netS1, netS2, netS3, netM));
            Elements.Add(new SignalBus("ALU_A", new Net[] { netA0, netA1, netA2, netA3 }));
            Elements.Add(new SignalBus("ALU_B", new Net[] { netB0, netB1, netB2, netB3 }));
            Elements.Add(new SignalBus("ALU_S", new Net[] { netS0, netS1, netS2, netS3 }));
            Elements.Add(new SignalBus("ALU_F", new Net[] { new Net(ALU0.F0), new Net(ALU0.F1), new Net(ALU0.F2), new Net(ALU0.F3) }));
            Elements.Add(new SignalLabel("/ALU_CIN", netCin));
            Elements.Add(new SignalLabel("ALU_M", netM));
            Elements.Add(new SignalLabel("/ALU_COUT", new Net(ALU0.CN4)));
            Net netEQ = new Net(ALU0.AEQB);
            Elements.Add(new SignalLabel("/ALU_EQ", netEQ));
            Elements.Add(R1 = new Resistor("R1", 1000, "1k"));
            R1.Passive[0].ConnectedNet = H;
            R1.Passive[1].ConnectedNet = netEQ;
#endif
        }
    }
}
