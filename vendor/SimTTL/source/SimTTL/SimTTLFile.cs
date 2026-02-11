// ================================================
//
// SPDX-FileCopyrightText: 2025 Stefan Warnke
//
// SPDX-License-Identifier: BeerWare
//
//=================================================

using SimBase;
using System;
using System.Collections.Generic;
using System.IO.Compression;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

using SimBase;
using ChipLibrary;
using Schematics;
using System.Reflection;
using static Schematics.KiCAD_Netlist;
using System.Diagnostics;
using System.Xml.Linq;
using static System.Windows.Forms.VisualStyles.VisualStyleElement.TaskbarClock;

namespace SimTTL
{
    /// <summary>
    /// Class definition to save and load SimTTL Files.
    /// </summary>
    internal class SimTTLFile
    {
        /// <summary>Definition of a SimTTL file ID..</summary>
        private const string FILE_ID_STR = "SimTTLFile";
        /// <summary>Name definition of the ChipLibray project to be used for identification of containg classes.</summary>
        private const string CHIP_LIBRARY = "ChipLibrary";
        /// <summary>Name definition of the SimBase project to be used for identification of containg classes.</summary>
        private const string SIM_BASE = "SimBase";

        /// <summary>Reference to the main form object.</summary>
        private frmMain main;

        /// <summary>
        /// Creates the instance of the SimTTLFile class.
        /// </summary>
        /// <param name="MainForm">Reference to the main form object.</param>
        public SimTTLFile(frmMain MainForm)
        {
            this.main = MainForm;
        }


        /// <summary>
        /// Save current state to a SimTTL file.
        /// </summary>
        /// <param name="FullFileName">Full file name of th target file.</param>
        public void SaveSimTTLFile(string FullFileName)
        {
            string dsfname = Path.GetDirectoryName(FullFileName) + "\\" + FILE_ID_STR + ".bin";
            if (Path.GetExtension(FullFileName) == "")
                FullFileName += ".sttlf";

            FileStream fs = null;
            BinaryWriter bw = null;
            bool success = true;
            List<string> loadFileNames = new List<string>();
            loadFileNames.Add(dsfname);
            try
            {
                fs = File.Open(dsfname, FileMode.Create);
                bw = new BinaryWriter(fs, Encoding.UTF8, false);
                bw.Write(FILE_ID_STR);
                bw.Write("1.0");
                bw.Write((byte)main.Schematics.SchematicsSource);
                bw.Write(main.Schematics.Name);
                string netfname = "";
                if (main.Schematics.NetlistFileName != null)
                {
                    netfname = main.Schematics.NetlistFileName;
                    if (netfname != "")
                    {
                        if (File.Exists(netfname))
                            loadFileNames.Add(netfname);
                        netfname = Path.GetFileName(main.Schematics.NetlistFileName);
                    }
                }
                bw.Write(netfname);
                bw.Write(main.SimulationTimeInterval);
                bw.Write(main.SimulationMaxTime);
                bw.Write(main.SignalsZoomX);
                bw.Write(main.SignalGraphHscrollValue);
                bw.Write(main.SignalGraphVscrollValue);
                bw.Write(main.DisplayMinTime);
                bw.Write(main.DisplayMaxTime);
                bw.Write(main.ExpandAll);
                bw.Write(main.IncludeInputs);
                bw.Write(main.DisplayPinNo);
                bw.Write(main.AutoCloseImportForm);

                string disfname = "";
                if (main.Schematics.Disassembler != null)
                {
                    disfname = main.Schematics.Disassembler.FileName;
                    if ((disfname != null) && (disfname != ""))
                    {
                        loadFileNames.Add(disfname);
                        disfname = Path.GetFileName(disfname);
                    }
                }
                bw.Write(disfname);

                bw.Write("Elements");
                bw.Write(main.Schematics.Elements.Count);
                for (int i = 0; i < main.Schematics.Elements.Count; i++)
                {
                    bw.Write(i);
                    BaseElement be = main.Schematics.Elements[i];
                    bw.Write(be.GetType().FullName);
                    bw.Write(be.Name);

                    string parms = "";
                    if ((be is SignalBus) || (be is CustomBus))
                        parms += "i" + be.Inputs[0].Length.ToString();
                    else if (be is ClockGenerator)
                    {
                        ClockGenerator cg = (ClockGenerator)be;
                        parms += "i" + ((byte)(cg.StartState)).ToString() + "|d" + cg.Interval.ToString() + "|d" + cg.TimerStart.ToString();
                    }
                    else if (be is ResetGenerator)
                        parms += "d" + ((ResetGenerator)be).ResetTime.ToString();
                    else if (be is RC_LP)
                        parms += "d" + ((RC_LP)be).RL.ToString() + "|d" + ((RC_LP)be).RH.ToString() + "|d" + ((RC_LP)be).C.ToString();
                    else if (be is RC_HP)
                        parms += "d" + ((RC_HP)be).C.ToString() + "|d" + ((RC_HP)be).R.ToString();
                    else if (be is RC_HP)
                        parms += "d" + ((Passive2Pin)be).Value.ToString() + "|s" + ((Passive2Pin)be).ValueStr;
                    else if (be is ResistorNetwork)
                    {
                        ResistorNetwork rn = (ResistorNetwork)be;
                        parms += "i" + rn.N.ToString() + "|B" + Convert.ToByte(rn.CommonPin).ToString() + "|d" + rn.Value.ToString() + "|s" + rn.ValueStr;
                    }
                    else if (be is Stimulus)
                    {
                        Stimulus st = (Stimulus)be;
                        // int Bits, byte Output, UInt64 Value, string ValueStr, double Time, string TimeStr, double Duration, string DurationStr
                        parms += "i" + st.Pins.Length.ToString() + "|b" + ((byte)st.Output).ToString() + "|U" + st.Value.ToString() + "|s" + st.ValueStr + "|d" + st.Time.ToString() + "|s" + st.TimeStr + "|d" + st.Duration.ToString() + "|s" + st.DurationStr;
                    }
                    else if (be is CountGenerator)
                    {
                        //CountGenerator(string Name, int Nout, double Interval, int StartCounter)
                        CountGenerator cg = (CountGenerator)be;
                        parms += "i" + cg.Nout.ToString() + "|d" + cg.Interval.ToString() + "|i" + cg.StartCounter.ToString();
                    }

                    bw.Write(parms);

                    string fname = "";
                    if (be is ILoadable)
                    {
                        fname = (be as ILoadable).GetFileName();
                        if (fname == null)
                            fname = "";
                        else
                        {
                            if (fname != "")
                            {
                                loadFileNames.Add(fname);
                                fname = Path.GetFileName(fname);
                            }
                        }
                    }
                    bw.Write(fname);
                }

                bw.Write("Netlist");
                List<Net> netlist = main.Schematics.GetNetList();
                bw.Write(netlist.Count);
                for (int i = 0; i < netlist.Count; i++)
                {
                    bw.Write(i);
                    bw.Write(netlist[i].Name);
                    bw.Write(netlist[i].ConnectedPins.Count);
                    for (int j = 0; j < netlist[i].ConnectedPins.Count; j++)
                    {
                        bw.Write(j);
                        if (netlist[i].ConnectedPins[j].Owner == null)
                            bw.Write("");
                        else
                            bw.Write(netlist[i].ConnectedPins[j].Owner.Name);
                        bw.Write(netlist[i].ConnectedPins[j].Name);
                        bw.Write(netlist[i].ConnectedPins[j].PinNo);
                    }
                }

                bw.Write("CurrentSignals");
                bw.Write(main.CurrentSignals.Count);
                for (int i = 0; i < main.CurrentSignals.Count; i++)
                {
                    bw.Write(i);
                    bw.Write(main.CurrentSignals[i].ScreenName);
                    bw.Write((byte)main.CurrentSignals[i].Radix);
                    bw.Write(main.CurrentSignals[i].Invert);
                    bw.Write(main.CurrentSignals[i].Reverse);
                    bw.Write(main.CurrentSignals[i].Highlight);
                    bw.Write(main.CurrentSignals[i].Expanded);
                }

                bw.Write("Cursor");
                if (main.CursorMarker != null)
                {
                    bw.Write(main.CursorMarker.Time);
                    bw.Write(main.CursorMarker.X);
                    bw.Write(main.CursorMarker.Selected);
                }
                else
                {
                    bw.Write(-1.0);
                    bw.Write(-1);
                    bw.Write(false);
                }

                bw.Write("Marker");
                bw.Write(main.Markers.Count);
                for (int i = 0; i < main.Markers.Count; i++)
                {
                    bw.Write(i);
                    bw.Write(main.Markers[i].Time);
                    bw.Write(main.Markers[i].X);
                    bw.Write(main.Markers[i].Selected);
                }

                bw.Write("TriggerMarker");
                if (main.TriggerMarker != null)
                {
                    bw.Write(main.TriggerMarker.Time);
                    bw.Write(main.TriggerMarker.X);
                    bw.Write(main.TriggerMarker.Selected);
                }
                else
                {
                    bw.Write(-1.0);
                    bw.Write(-1);
                    bw.Write(false);
                }


                bw.Write("Stimuli");
                bw.Write(main.CurrentStimuli.Count);
                for (int i = 0; i < main.CurrentStimuli.Count; i++)
                {
                    bw.Write(i);
                    bw.Write(main.CurrentStimuli[i].SignalName);
                    bw.Write(main.CurrentStimuli[i].Pins.Length);
                    bw.Write((byte)main.CurrentStimuli[i].Output);
                    bw.Write(main.CurrentStimuli[i].Value);
                    bw.Write(main.CurrentStimuli[i].ValueStr);
                    bw.Write(main.CurrentStimuli[i].Time);
                    bw.Write(main.CurrentStimuli[i].TimeStr);
                    bw.Write(main.CurrentStimuli[i].Duration);
                    bw.Write(main.CurrentStimuli[i].DurationStr);
                }

                bw.Write("Triggers");
                bw.Write(main.CurrentTriggers.Count);
                for (int i = 0; i < main.CurrentTriggers.Count; i++)
                {
                    bw.Write(i);
                    bw.Write(main.CurrentTriggers[i].SignalName);
                    bw.Write(main.CurrentTriggers[i].Bits);
                    bw.Write((byte)main.CurrentTriggers[i].Condition);
                    bw.Write(main.CurrentTriggers[i].CompareValue);
                    bw.Write(main.CurrentTriggers[i].CompareValueStr);
                    bw.Write((byte)main.CurrentTriggers[i].Logic);
                }

                bw.Write("Schematics");
                bw.Write(main.Schematics.TimeInterval);
                bw.Write(main.Schematics.MaxTime);
                bw.Write(main.Schematics.Time);
                bw.Write(main.Schematics.SimRunTime);
                bw.Write(main.Schematics.TriggerTime);
                bw.Write(main.Schematics.TriggerOccured);
                bw.Write(main.Schematics.EnableTrigger);
                bw.Write(main.Schematics.TriggerPosition);

                bw.Write("History");
                bw.Write(main.Schematics.Elements.Count);
                for (int i = 0; i < main.Schematics.Elements.Count; i++)
                {
                    bw.Write(i);
                    BaseElement be = main.Schematics.Elements[i];
                    bw.Write(be.Name);
                    bw.Write("Power");
                    bw.Write(be.Power.Length);
                    for (int j = 0; j < be.Power.Length; j++)
                    {
                        bw.Write(j);
                        bw.Write(be.Power[j].History.Count);
                        for (int k = 0; k < be.Power[j].History.Count; k++)
                        {
                            bw.Write(k);
                            bw.Write(be.Power[j].History[k].Time);
                            bw.Write((byte)be.Power[j].History[k].State);
                        }
                    }

                    bw.Write("Ground");
                    bw.Write(be.Ground.Length);
                    for (int j = 0; j < be.Ground.Length; j++)
                    {
                        bw.Write(j);
                        bw.Write(be.Ground[j].History.Count);
                        for (int k = 0; k < be.Ground[j].History.Count; k++)
                        {
                            bw.Write(k);
                            bw.Write(be.Ground[j].History[k].Time);
                            bw.Write((byte)be.Ground[j].History[k].State);
                        }
                    }

                    bw.Write("Passive");
                    bw.Write(be.Passive.Length);
                    for (int j = 0; j < be.Passive.Length; j++)
                    {
                        bw.Write(j);
                        bw.Write(be.Passive[j].History.Count);
                        for (int k = 0; k < be.Passive[j].History.Count; k++)
                        {
                            bw.Write(k);
                            bw.Write(be.Passive[j].History[k].Time);
                            bw.Write((byte)be.Passive[j].History[k].State);
                        }
                    }

                    bw.Write("Inputs");
                    bw.Write(be.Inputs.Length);
                    for (int j = 0; j < be.Inputs.Length; j++)
                    {
                        bw.Write(j);
                        bw.Write(be.Inputs[j].Length);
                        for (int jj = 0; jj < be.Inputs[j].Length; jj++)
                        {
                            bw.Write(jj);
                            bw.Write(be.Inputs[j][jj].History.Count);
                            for (int k = 0; k < be.Inputs[j][jj].History.Count; k++)
                            {
                                bw.Write(k);
                                bw.Write(be.Inputs[j][jj].History[k].Time);
                                bw.Write((byte)be.Inputs[j][jj].History[k].State);
                            }
                        }
                    }

                    bw.Write("Outputs");
                    bw.Write(be.Outputs.Length);
                    for (int j = 0; j < be.Outputs.Length; j++)
                    {
                        bw.Write(j);
                        bw.Write(be.Outputs[j].Length);
                        for (int jj = 0; jj < be.Outputs[j].Length; jj++)
                        {
                            bw.Write(jj);
                            bw.Write(be.Outputs[j][jj].History.Count);
                            for (int k = 0; k < be.Outputs[j][jj].History.Count; k++)
                            {
                                bw.Write(k);
                                bw.Write(be.Outputs[j][jj].History[k].Time);
                                bw.Write((byte)be.Outputs[j][jj].History[k].State);
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                success = false;
                MessageBox.Show(ex.Message);
            }

            if (bw != null)
                bw.Close();

            if (fs != null)
                fs.Close();

            if (success)
            {
                using (FileStream zipToOpen = new FileStream(FullFileName, FileMode.Create))
                {
                    using (ZipArchive archive = new ZipArchive(zipToOpen, ZipArchiveMode.Update))
                    {
                        foreach (string fname in loadFileNames)
                            archive.CreateEntryFromFile(fname, Path.GetFileName(fname));
                    }
                }
            }

            if (File.Exists(dsfname))
                File.Delete(dsfname);
        }



        /// <summary>
        /// Find the assembly with a matching name.
        /// </summary>
        /// <param name="AssemblyName">Name of the assembly to find.</param>
        /// <returns>Reference to the found assembly or null.</returns>
        private Assembly GetAssembly(string AssemblyName)
        {
            Assembly[] assemblies = AppDomain.CurrentDomain.GetAssemblies();
            foreach (Assembly assy in assemblies)
            {
                string[] s = assy.FullName.Split(new char[] { ',' });
                if (s[0] == AssemblyName)
                    return assy;
            }
            return null;
        }

        /// <summary>
        /// Get the type of the type matching the TypeName from the assembly defined by AssemblyName.
        /// </summary>
        /// <param name="AssemblyName">Name of the assembly to search for the type</param>
        /// <param name="TypeName">Name of the class type to look for.</param>
        /// <returns>Type of the matching class or null if not found.</returns>
        private Type FindTypeInLibrary(string AssemblyName, string TypeName)
        {
            Assembly assembly = GetAssembly(AssemblyName);
            Type type = assembly.GetType(AssemblyName + "." + TypeName);
            if (type != null)
                return type;

            foreach (Type t in assembly.ExportedTypes)
            {
                if (TypeName.Contains(t.Name))
                    return t;
            }

            return null;
        }

        /// <summary>Logic family names to be mapped to the available chips.</summary>
        private string[] LogicFamilies = { "ACTQ", "AHCT", "ACT", "ALS", "AS", "C", "F", "HCT", "HC", "LS", "S" };

        /// <summary>
        /// Get a parameter object converted from the string with the leading character identifying the target type.
        /// </summary>
        /// <param name="s">Parameter string with a leading character of the target type</param>
        /// <returns>Object of the target type with the converted contents.</returns>
        private object GetParm(string s)
        {
            char ch = s[0];
            s = s.Substring(1);
            switch (ch)
            {
                case 'b':
                    return Convert.ToByte(s);
                case 'B':
                    return Convert.ToBoolean(Convert.ToByte(s));
                case 'i':
                    return Convert.ToInt32(s);
                case 'u':
                    return Convert.ToUInt32(s);
                case 'I':
                    return Convert.ToInt64(s);
                case 'U':
                    return Convert.ToUInt64(s);
                case 'f':
                    return Convert.ToSingle(s);
                case 'd':
                    return Convert.ToDouble(s);
                case 's':
                    return s;
            }
            return null;
        }

        /// <summary>
        /// Convert the parameter string containing one or multiple separated parameters.
        /// </summary>
        /// <param name="name">Name string inserted into the result as first parameter.</param>
        /// <param name="parmstr">String containing additional parameters</param>
        /// <returns>Array of different parameter types.</returns>
        private object[] GetParms(string name, string parmstr)
        {
            if (parmstr == "")
                return new object[] { name };

            string[] ss = parmstr.Split('|');
            object[] parms = new object[ss.Length + 1];
            parms[0] = name;
            for (int i = 0; i < ss.Length; i++)
                parms[i + 1] = GetParm(ss[i]);
            return parms;
        }

        /// <summary>
        /// Load the contents of a saved SimTTL file and restore the contents to the internal objects.
        /// </summary>
        /// <param name="FullFileName">Full file name of the SimTTL file to load.</param>
        public void LoadSimTTLFile(string FullFileName)
        {
            string tmpdir = Application.StartupPath + "\\temp\\";

            if (Directory.Exists(tmpdir) == false)
                Directory.CreateDirectory(tmpdir);

            using (ZipArchive archive = ZipFile.OpenRead(FullFileName))
            {
                foreach (ZipArchiveEntry entry in archive.Entries)
                    entry.ExtractToFile(tmpdir + entry.Name, true);
            }

            string dsfname = tmpdir + FILE_ID_STR + ".bin";

            FileStream fs = null;
            BinaryReader br = null;
            bool success = true;
            HCT00 test = new HCT00(""); // forces application to load the ChipLibrary

            try
            {
                fs = File.Open(dsfname, FileMode.Open);
                br = new BinaryReader(fs, Encoding.UTF8, false);

                if (br.ReadString() != FILE_ID_STR)
                    throw new Exception("File Identifier Mismatch!");

                if (br.ReadString() != "1.0")
                    throw new Exception("Revision Mismatch!");

                SchematicsSource source = (SchematicsSource)br.ReadByte();
                string name = br.ReadString();
                string netlistFileName = br.ReadString();
                main.Schematics = new BaseSchematics(name);
                main.Schematics.SchematicsSource = source;
                main.Schematics.NetlistFileName = netlistFileName;

                main.SimulationTimeInterval = br.ReadDouble();
                main.SimulationMaxTime = br.ReadDouble();
                main.SignalsZoomX = br.ReadDouble();
                main.AppSettings.SignalGraphsLocationX = br.ReadInt32();
                main.AppSettings.SignalGraphsLocationY = br.ReadInt32();
                main.DisplayMinTime = br.ReadDouble();
                main.DisplayMaxTime = br.ReadDouble();
                main.ExpandAll = br.ReadBoolean();
                main.IncludeInputs = br.ReadBoolean();
                main.DisplayPinNo = br.ReadBoolean();
                main.AutoCloseImportForm = br.ReadBoolean();

                main.Schematics.Disassembler = new BaseDisassembler();
                string fname = br.ReadString();
                if ((fname != "") && (File.Exists(tmpdir + fname)))
                    main.Schematics.Disassembler.LoadFile(tmpdir + fname);

                if (br.ReadString() != "Elements")
                    throw new Exception("ID \"Elements\" is missing!");

                int n = br.ReadInt32();
                for (int i = 0; i < n; i++)
                {
                    try
                    {
                        int idx = br.ReadInt32();
                        if (i != idx)
                            throw new Exception("Elements index mismatch " + idx.ToString() + "!=" + i.ToString() + " !");

                        string elementtype = br.ReadString();             // bw.Write(be.GetType().FullName);
                        string elementname = br.ReadString();             // bw.Write(be.Name);
                        string parmstr = br.ReadString();
                        string loadfname = br.ReadString();

                        string[] ss = elementtype.Split('.');

                        Type type = FindTypeInLibrary(ss[0], ss[1]);

                        BaseElement be = null;
                        be = (BaseElement)Activator.CreateInstance(type, GetParms(elementname, parmstr));

                        if ((be is ILoadable) && (loadfname != null) && (File.Exists(tmpdir + loadfname)))
                            (be as ILoadable).LoadContents(tmpdir + loadfname);

                        main.Schematics.Elements.Add(be);
                    }
                    catch (Exception ex) { throw new Exception("Elements:\n" + ex.Message); }
                }

                if (br.ReadString() != "Netlist")
                    throw new Exception("ID \"Netlist\" is missing!");

                n = br.ReadInt32();
                for (int i = 0; i < n; i++)
                {
                    try
                    {
                        int idx = br.ReadInt32();
                        if (i != idx)
                            throw new Exception("Netlist index mismatch " + idx.ToString() + "!=" + i.ToString() + " !");

                        string netname = br.ReadString();
                        int m = br.ReadInt32();                         // bw.Write(netlist[i].ConnectedPins.Count);
                        Net net = new Net(netname);
                        if (i == 9)
                            Debug.WriteLine("");

                        for (int j = 0; j < m; j++)
                        {
                            try
                            {
                                int idxj = br.ReadInt32();
                                if (j != idxj)
                                    throw new Exception("Netlist ConnectedPins index mismatch " + idxj.ToString() + "!=" + j.ToString() + " !");

                                string owner = br.ReadString();
                                string pname = br.ReadString();           // bw.Write(netlist[i].ConnectedPins[j].Name);
                                string pinno = br.ReadString();             // bw.Write(netlist[i].ConnectedPins[j].PinNo);

                                BaseElement be = main.Schematics.GetElement(owner);
                                if (be == null)
                                    throw new Exception("Netlist i=" + i.ToString() + " j=" + j.ToString() + " owner=" + owner + " pname=" + pname + " pinno=" + pinno + " be==null!");
                                Pin pin = be.GetPin(pinno);
                                if (net.ConnectedPins == null)
                                    throw new Exception("Netlist i=" + i.ToString() + " j=" + j.ToString() + " owner=" + owner + " pname=" + pname + " pinno=" + pinno + " net.ConnectedPins==null!");
                                net.ConnectedPins.Add(pin);
                            }
                            catch (Exception ex) { throw new Exception("Netlist:\n" + ex.Message); }
                        }
                    }
                    catch (Exception ex) { throw new Exception("Netlist:\n" + ex.Message); }
                }


                if (br.ReadString() != "CurrentSignals")
                    throw new Exception("ID \"CurrentSignals\" is missing!");

                main.CurrentSignals.Clear();
                n = br.ReadInt32();
                for (int i = 0; i < n; i++)
                {
                    try
                    {
                        int idx = br.ReadInt32();
                        if (i != idx)
                            throw new Exception("CurrentSignals index mismatch " + idx.ToString() + "!=" + i.ToString() + " !");

                        string screenname = br.ReadString();
                        DisplaySignal ds = main.CreateLinkedDisplaySignal(screenname);
                        if (ds == null)
                            throw new Exception("CurrentSignals screenname= " + screenname + "  ds == null !");

                        ds.Radix = (RadixType)br.ReadByte();
                        ds.Invert = br.ReadBoolean();
                        ds.Reverse = br.ReadBoolean();
                        ds.Highlight = br.ReadBoolean();
                        ds.Expanded = br.ReadBoolean();
                        main.CurrentSignals.Add(ds);
                    }
                    catch (Exception ex) { throw new Exception("CurrentSignals:\n" + ex.Message); }
                }

                if (br.ReadString() != "Cursor")
                    throw new Exception("ID \"Cursor\" is missing!");
                main.CursorMarker = new Marker();
                main.CursorMarker.Time = br.ReadDouble();
                main.CursorMarker.X = br.ReadInt32();
                main.CursorMarker.Selected = br.ReadBoolean();

                if (br.ReadString() != "Marker")
                    throw new Exception("ID \"Marker\" is missing!");
                main.Markers.Clear();
                n = br.ReadInt32();
                for (int i = 0; i < n; i++)
                {
                    try
                    {
                        int idx = br.ReadInt32();
                        if (i != idx)
                            throw new Exception("Marker index mismatch " + idx.ToString() + "!=" + i.ToString() + " !");
                        Marker marker = new Marker();
                        marker.Time = br.ReadDouble();
                        marker.X = br.ReadInt32();
                        marker.Selected = br.ReadBoolean();
                        main.Markers.Add(marker);
                    }
                    catch (Exception ex) { throw new Exception("Marker:\n" + ex.Message); }
                }

                if (br.ReadString() != "TriggerMarker")
                    throw new Exception("ID \"TriggerMarker\" is missing!");
                main.TriggerMarker = new Marker();
                main.TriggerMarker.Time = br.ReadDouble();
                main.TriggerMarker.X = br.ReadInt32();
                main.TriggerMarker.Selected = br.ReadBoolean();


                if (br.ReadString() != "Stimuli")
                    throw new Exception("ID \"Stimuli\" is missing!");
                main.CurrentStimuli.Clear();
                n = br.ReadInt32();
                for (int i = 0; i < n; i++)
                {
                    try
                    {
                        int idx = br.ReadInt32();
                        if (i != idx)
                            throw new Exception("Stimuli index mismatch " + idx.ToString() + "!=" + i.ToString() + " !");

                        string signalName = br.ReadString();
                        int bits = br.ReadInt32();
                        Stimulus.OutputType otype = (Stimulus.OutputType)br.ReadByte();
                        UInt64 value = br.ReadUInt64();
                        string valueStr = br.ReadString();
                        double time = br.ReadDouble();
                        string timeStr = br.ReadString();
                        double duration = br.ReadDouble();
                        string durationStr = br.ReadString();
                        Stimulus stim = new Stimulus(signalName, bits, otype, value, valueStr, time, timeStr, duration, durationStr);
                        main.CurrentStimuli.Add(stim);
                    }
                    catch (Exception ex) { throw new Exception("Stimuli:\n" + ex.Message); }
                }

                if (br.ReadString() != "Triggers")
                    throw new Exception("ID \"Triggers\" is missing!");
                main.CurrentTriggers.Clear();
                n = br.ReadInt32();
                for (int i = 0; i < n; i++)
                {
                    try
                    {
                        int idx = br.ReadInt32();
                        if (i != idx)
                            throw new Exception("Trigger index mismatch " + idx.ToString() + "!=" + i.ToString() + " !");

                        string signalName = br.ReadString();
                        int bits = br.ReadInt32();
                        Trigger.CompareCondition cc = (Trigger.CompareCondition)br.ReadByte();
                        UInt64 value = br.ReadUInt64();
                        string valueStr = br.ReadString();
                        Trigger.LogicOp lo = (Trigger.LogicOp)br.ReadByte();
                        Trigger trg = new Trigger(signalName, bits, cc, value, valueStr, lo);
                        main.CurrentTriggers.Add(trg);
                    }
                    catch (Exception ex) { throw new Exception("Triggers:\n" + ex.Message); }
                }

                if (br.ReadString() != "Schematics")
                    throw new Exception("ID \"Schematics\" is missing!");
                double timeInterval = br.ReadDouble();
                double maxTime = br.ReadDouble();
                double simTime = br.ReadDouble();
                double simRunTime = br.ReadDouble();
                double triggerTime = br.ReadDouble();
                bool triggerOccured = br.ReadBoolean();
                main.Schematics.RestoreState(timeInterval, maxTime, simTime, simRunTime, triggerTime, triggerOccured);
                main.Schematics.EnableTrigger = br.ReadBoolean();
                main.Schematics.TriggerPosition = br.ReadDouble();

                if (br.ReadString() != "History")
                    throw new Exception("ID \"History\" is missing!");
                if (br.ReadInt32() != main.Schematics.Elements.Count)
                    throw new Exception("History schematics element count mismatch!");
                for (int i = 0; i < main.Schematics.Elements.Count; i++)
                {
                    try
                    {
                        int idx = br.ReadInt32();
                        if (i != idx)
                            throw new Exception("History index mismatch " + idx.ToString() + "!=" + i.ToString() + " !");

                        BaseElement be = main.Schematics.Elements[i];
                        string elementName = br.ReadString();
                        if (be.Name != elementName)
                            throw new Exception("History schematics element name mismatch \"" + elementName + "\"!=\"" + be.Name + "\" !");

                        if (br.ReadString() != "Power")
                            throw new Exception("History schematics element \"Power\" is missing!");

                        int m = br.ReadInt32();
                        if (be.Power.Length != m)
                            throw new Exception("History schematics element power length mismatch " + m.ToString() + "!=" + be.Power.Length.ToString() + " !");

                        for (int j = 0; j < be.Power.Length; j++)
                        {
                            int idxj = br.ReadInt32();
                            if (j != idxj)
                                throw new Exception("History schematics element power index mismatch " + idxj.ToString() + "!=" + j.ToString() + " !");

                            int mm = br.ReadInt32();
                            for (int k = 0; k < mm; k++)
                            {
                                int idxk = br.ReadInt32();
                                if (k != idxk)
                                    throw new Exception("History schematics element power history index mismatch " + idxk.ToString() + "!=" + k.ToString() + " !");

                                double time = br.ReadDouble();
                                SignalState state = (SignalState)br.ReadByte();
                                be.Power[j].History.Add(time, state);
                            }
                        }


                        if (br.ReadString() != "Ground")
                            throw new Exception("History schematics element \"Ground\" is missing!");

                        m = br.ReadInt32();
                        if (be.Ground.Length != m)
                            throw new Exception("History schematics element Ground length mismatch " + m.ToString() + "!=" + be.Ground.Length.ToString() + " !");

                        for (int j = 0; j < be.Ground.Length; j++)
                        {
                            int idxj = br.ReadInt32();
                            if (j != idxj)
                                throw new Exception("History schematics element ground index mismatch " + idxj.ToString() + "!=" + j.ToString() + " !");

                            int mm = br.ReadInt32();
                            for (int k = 0; k < mm; k++)
                            {
                                int idxk = br.ReadInt32();
                                if (k != idxk)
                                    throw new Exception("History schematics element ground history index mismatch " + idxk.ToString() + "!=" + k.ToString() + " !");

                                double time = br.ReadDouble();
                                SignalState state = (SignalState)br.ReadByte();
                                be.Ground[j].History.Add(time, state);
                            }
                        }


                        if (br.ReadString() != "Passive")
                            throw new Exception("History schematics element \"Passive\" is missing!");

                        m = br.ReadInt32();
                        if (be.Passive.Length != m)
                            throw new Exception("History schematics element passive length mismatch " + m.ToString() + "!=" + be.Passive.Length.ToString() + " !");

                        for (int j = 0; j < be.Passive.Length; j++)
                        {
                            int idxj = br.ReadInt32();
                            if (j != idxj)
                                throw new Exception("History schematics element passive index mismatch " + idxj.ToString() + "!=" + j.ToString() + " !");

                            int mm = br.ReadInt32();
                            for (int k = 0; k < mm; k++)
                            {
                                int idxk = br.ReadInt32();
                                if (k != idxk)
                                    throw new Exception("History schematics element passive history index mismatch " + idxk.ToString() + "!=" + k.ToString() + " !");

                                double time = br.ReadDouble();
                                SignalState state = (SignalState)br.ReadByte();
                                be.Passive[j].History.Add(time, state);
                            }
                        }

                        if (br.ReadString() != "Inputs")
                            throw new Exception("History schematics element \"Inputs\" is missing!");

                        m = br.ReadInt32();
                        if (be.Inputs.Length != m)
                            throw new Exception("History schematics element inputs length mismatch " + m.ToString() + "!=" + be.Inputs.Length.ToString() + " !");

                        for (int j = 0; j < be.Inputs.Length; j++)
                        {
                            int idxj = br.ReadInt32();
                            if (j != idxj)
                                throw new Exception("History schematics element inputs index mismatch " + idxj.ToString() + "!=" + j.ToString() + " !");

                            int ml = br.ReadInt32();
                            if (be.Inputs[j].Length != ml)
                                throw new Exception("History schematics element inputs[j] length mismatch " + ml.ToString() + "!=" + be.Inputs[j].Length.ToString() + " !");

                            for (int jj = 0; jj < be.Inputs[j].Length; jj++)
                            {
                                int idxjj = br.ReadInt32();
                                if (jj != idxjj)
                                    throw new Exception("History schematics element inputs[j] index mismatch " + idxjj.ToString() + "!=" + jj.ToString() + " !");

                                int mm = br.ReadInt32();
                                for (int k = 0; k < mm; k++)
                                {
                                    int idxk = br.ReadInt32();
                                    if (k != idxk)
                                        throw new Exception("History schematics element inputs[j][jj] history index mismatch " + idxk.ToString() + "!=" + k.ToString() + " !");

                                    double time = br.ReadDouble();
                                    SignalState state = (SignalState)br.ReadByte();
                                    be.Inputs[j][jj].History.Add(time, state);
                                }
                            }
                        }


                        if (br.ReadString() != "Outputs")
                            throw new Exception("History schematics element \"Outputs\" is missing!");

                        m = br.ReadInt32();
                        if (be.Outputs.Length != m)
                            throw new Exception("History schematics element outputs length mismatch " + m.ToString() + "!=" + be.Outputs.Length.ToString() + " !");

                        for (int j = 0; j < be.Outputs.Length; j++)
                        {
                            int idxj = br.ReadInt32();
                            if (j != idxj)
                                throw new Exception("History schematics element outputs index mismatch " + idxj.ToString() + "!=" + j.ToString() + " !");

                            int ml = br.ReadInt32();
                            if (be.Outputs[j].Length != ml)
                                throw new Exception("History schematics element outputs[j] length mismatch " + ml.ToString() + "!=" + be.Outputs[j].Length.ToString() + " !");

                            for (int jj = 0; jj < be.Outputs[j].Length; jj++)
                            {
                                int idxjj = br.ReadInt32();
                                if (jj != idxjj)
                                    throw new Exception("History schematics element outputs[j] index mismatch " + idxjj.ToString() + "!=" + jj.ToString() + " !");

                                int mm = br.ReadInt32();
                                for (int k = 0; k < mm; k++)
                                {
                                    int idxk = br.ReadInt32();
                                    if (k != idxk)
                                        throw new Exception("History schematics element outputs[j][jj] history index mismatch " + idxk.ToString() + "!=" + k.ToString() + " !");

                                    double time = br.ReadDouble();
                                    SignalState state = (SignalState)br.ReadByte();
                                    be.Outputs[j][jj].History.Add(time, state);
                                }
                            }
                        }
                    }
                    catch (Exception ex) { throw new Exception("History:\n" + ex.Message); }
                }
            }
            catch (Exception ex)
            {
                success = false;
                MessageBox.Show(ex.Message);
            }

            if (br != null)
                br.Close();

            if (fs != null)
                fs.Close();

            Directory.Delete(tmpdir, true);
        }

    }
}
