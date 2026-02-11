// ================================================
//
// SPDX-FileCopyrightText: 2025 Stefan Warnke
//
// SPDX-License-Identifier: BeerWare
//
//=================================================

//#define DEBUG_WRITE
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.IO;
using System.Diagnostics;

using SimBase;

namespace ChipLibrary
{
    /// <summary>
    /// Class definition of the 32kx8 RAM chip HM62256.
    /// </summary>
    public class HM62256 : BaseElement, ILoadable
    {
        // Datasheet: https://eater.net/datasheets/hm62256b.pdf

        private const double ACCESS_TIME = 70; // in ns
        private const double WRITE_PULSE_WIDTH = 50;
        private const double DATA_TO_WRITE_TIME_OVERLAP = 30;
        private const double OUTPUT_DISABLE_TO_Z = 25;

        #region Private Fields
        private byte[] Mem;
        private string fileName;
        private Pin[] addrBus;
        private Pin[] dataBus;
        private SignalState lastCSn;
        private SignalState lastOEn;
        private SignalState lastWEn;
        private double WEnTime;
        #endregion Private Fields

        #region Control Pins
        public Pin WEn;
        public Pin CSn;
        public Pin OEn;
        #endregion Control Pins

        #region Address Pins
        public Pin A0;
        public Pin A1;
        public Pin A2;
        public Pin A3;
        public Pin A4;
        public Pin A5;
        public Pin A6;
        public Pin A7;
        public Pin A8;
        public Pin A9;
        public Pin A10;
        public Pin A11;
        public Pin A12;
        public Pin A13;
        public Pin A14;
        #endregion Address Pins

        #region Data Pins
        public Pin IO0;
        public Pin IO1;
        public Pin IO2;
        public Pin IO3;
        public Pin IO4;
        public Pin IO5;
        public Pin IO6;
        public Pin IO7;
        #endregion Data Pins

        #region Constructors
        /// <summary>
        /// Creates the instance without net connections.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public HM62256(string Name) : this(Name, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null) { }

        /// <summary>
        /// Creates the instance including input net connections.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public HM62256(string Name, Net NetWEn, Net NetCSn, Net NetOEn, Net NetA0, Net NetA1, Net NetA2, Net NetA3, Net NetA4, Net NetA5, Net NetA6, Net NetA7, Net NetA8, Net NetA9, Net NetA10, Net NetA11, Net NetA12, Net NetA13, Net NetA14, Net NetIO0, Net NetIO1, Net NetIO2, Net NetIO3, Net NetIO4, Net NetIO5, Net NetIO6, Net NetIO7) : base(Name)
        {
            this.fileName = "";
            this.Mem = new byte[65536];
            for (int i = 0; i < this.Mem.Length; i++)
                Mem[i] = (byte)(i ^ 0xFF); // (i ^ 0xFF);

            lastCSn = SignalState.H;
            lastOEn = SignalState.H;
            lastWEn = SignalState.H;
            WEnTime = 0;

            this.Power[0] =  new Pin(this, "VCC", "28");
            this.Ground[0] = new Pin(this, "GND", "14");

            this.WEn = new Pin(this, "WEn", "27", LineMode.In, SignalState.H, NetWEn);
            this.CSn = new Pin(this, "CSn", "20", LineMode.In, SignalState.H, NetCSn);
            this.OEn = new Pin(this, "OEn", "22", LineMode.In, SignalState.H, NetOEn);
                                                                          
            this.A0 = new Pin(this,   "A0", "10", LineMode.In, SignalState.L, NetA0);
            this.A1 = new Pin(this,   "A1",  "9", LineMode.In, SignalState.L, NetA1);
            this.A2 = new Pin(this,   "A2",  "8", LineMode.In, SignalState.L, NetA2);
            this.A3 = new Pin(this,   "A3",  "7", LineMode.In, SignalState.L, NetA3);
            this.A4 = new Pin(this,   "A4",  "6", LineMode.In, SignalState.L, NetA4);
            this.A5 = new Pin(this,   "A5",  "5", LineMode.In, SignalState.L, NetA5);
            this.A6 = new Pin(this,   "A6",  "4", LineMode.In, SignalState.L, NetA6);
            this.A7 = new Pin(this,   "A7",  "3", LineMode.In, SignalState.L, NetA7);
            this.A8 = new Pin(this,   "A8", "25", LineMode.In, SignalState.L, NetA8);
            this.A9 = new Pin(this,   "A9", "24", LineMode.In, SignalState.L, NetA9);
            this.A10 = new Pin(this, "A10", "21", LineMode.In, SignalState.L, NetA10);
            this.A11 = new Pin(this, "A11", "23", LineMode.In, SignalState.L, NetA11);
            this.A12 = new Pin(this, "A12",  "2", LineMode.In, SignalState.L, NetA12);
            this.A13 = new Pin(this, "A13", "26", LineMode.In, SignalState.L, NetA13);
            this.A14 = new Pin(this, "A14",  "1", LineMode.In, SignalState.L, NetA14);

            this.IO0 = new Pin(this, "IO0", "11", LineMode.BiDir, SignalState.Z, ACCESS_TIME, NetIO0);
            this.IO1 = new Pin(this, "IO1", "12", LineMode.BiDir, SignalState.Z, ACCESS_TIME, NetIO1);
            this.IO2 = new Pin(this, "IO2", "13", LineMode.BiDir, SignalState.Z, ACCESS_TIME, NetIO2);
            this.IO3 = new Pin(this, "IO3", "15", LineMode.BiDir, SignalState.Z, ACCESS_TIME, NetIO3);
            this.IO4 = new Pin(this, "IO4", "16", LineMode.BiDir, SignalState.Z, ACCESS_TIME, NetIO4);
            this.IO5 = new Pin(this, "IO5", "17", LineMode.BiDir, SignalState.Z, ACCESS_TIME, NetIO5);
            this.IO6 = new Pin(this, "IO6", "18", LineMode.BiDir, SignalState.Z, ACCESS_TIME, NetIO6);
            this.IO7 = new Pin(this, "IO7", "19", LineMode.BiDir, SignalState.Z, ACCESS_TIME, NetIO7);

            Inputs = new Pin[4][];
            SetPinArray(Inputs, 0, this.WEn);
            SetPinArray(Inputs, 1, this.CSn);
            SetPinArray(Inputs, 2, this.OEn);
            addrBus = new Pin[] { this.A0, this.A1, this.A2, this.A3, this.A4, this.A5, this.A6, this.A7, this.A8, this.A9, this.A10, this.A11, this.A12, this.A13, this.A14 };
            Inputs[3] = addrBus;

            Outputs = new Pin[1][];
            dataBus = new Pin[] { this.IO0, this.IO1, this.IO2, this.IO3, this.IO4, this.IO5, this.IO6, this.IO7 };
            Outputs[0] = dataBus;

            SimulationRestart();
        }
        #endregion Constructors

        #region Protected Methods
        /// <summary>
        /// Update inputs to the simulation time.
        /// </summary>
        /// <param name="Time">Time value to update to.</param>
        protected override void UpdateInputs(double Time)
        {
            base.UpdateInputs(Time);

            if ((CSn.State == SignalState.L) && (OEn.State == SignalState.H) && (WEn.State == SignalState.L))
            {
                for (int i = 0; i < dataBus.Length; i++)
                    dataBus[i].UpdateInput(Time);
            }
        }

        /// <summary>
        /// Update outputs to the simulation time.
        /// </summary>
        /// <param name="Time">Time value to update to.</param>
        protected override void UpdateOutputs(double Time)
        {
            if (WEn.State == SignalState.H)
                base.UpdateOutputs(Time);
        }
        #endregion Protected Methods

        #region Public Methods
        /// <summary>
        /// Load the contents of a binary file into the element.
        /// </summary>
        /// <param name="FileName">Full file name of the file to be loaded.</param>
        public void LoadContents(string FileName)
        {
            fileName = FileName;
            byte[] buffer = File.ReadAllBytes(FileName);
            for (int i = 0; i < Math.Min(Mem.Length, buffer.Length); i++)
                Mem[i] = buffer[i];
        }

        /// <summary>
        /// Return the file name passed in LoadContents
        /// </summary>
        /// <returns>File name used in LoadContents.</returns>
        public string GetFileName()
        {
            return this.fileName;
        }

        /// <summary>
        /// Build the address from the address pin states
        /// </summary>
        /// <returns>Address as integer.</returns>
        protected int GetAddr()
        {
            int addr = 0;
            for (int i = 0; i < addrBus.Length; i++)
            {
                if (addrBus[i].State == SignalState.L)
                { }
                else if (addrBus[i].State == SignalState.H)
                {
                    addr |= 1 << i;
                }
                else
                {
                    //SetNewOutputStates(0, SignalState.U);
                    return -1;
                }
            }
            return addr;
        }

        /// <summary>
        /// Update outputs and inputs to the simulation time.
        /// </summary>
        /// <param name="Time">Time value to update to.</param>
        public override void Update(double Time)
        {
            base.Update(Time);

#if DEBUG_WRITE
            {
                int addr = GetAddr();
                Debug.WriteLine("Time=" + Time.ToString() + ",CSn=" + CSn.State.ToString() + ",OEn=" + OEn.State.ToString() + ",WEn=" + WEn.State.ToString() + ",Addr=0x" + addr.ToString("X04") + ",Name=" + Name);
            }
#endif

            if (CSn.State == SignalState.L)
            {
                lastCSn = CSn.State;

                if (OEn.State == SignalState.L)
                {
                    lastOEn = OEn.State;
                    int addr = GetAddr();
                    int data = 0;
                    if (addr >= 0)
                    {
                        data = Mem[addr];
                        for (int i = 0; i < dataBus.Length; i++)
                        {
                            if ((data & 1) == 0)
                                dataBus[i].NewOutState = SignalState.L;
                            else
                                dataBus[i].NewOutState = SignalState.H;

                            data >>= 1;
                        }
                    }
#if DEBUG_WRITE
                    Debug.WriteLine("Time=" + Time.ToString() + ",OEn=" + OEn.State.ToString() + ",RAM Read,Addr=0x" + addr.ToString("X04") + ",Data=" + data.ToString("X02")+",Name="+Name);
#endif
                }
                else if (WEn.State == SignalState.L)
                {
                    if (lastWEn == SignalState.H)
                    {
                        WEnTime = Time;
                        for (int i = 0; i < dataBus.Length; i++)
                            dataBus[i].DeactivateDriver();
#if DEBUG_WRITE
                        Debug.WriteLine("Time=" + Time.ToString() + ",RAM Write,WEn falling edge" + ",Name=" + Name);
#endif
                    }
                    else if ((Time - WEnTime) > (WRITE_PULSE_WIDTH - DATA_TO_WRITE_TIME_OVERLAP))
                    {
                        int addr = GetAddr();
                        int data = 0;
                        if (addr >= 0)
                        {
                            for (int i = 0; i < dataBus.Length; i++)
                            {
                                if (dataBus[i].State == SignalState.L)
                                { }
                                else if (dataBus[i].State == SignalState.H)
                                {
                                    data |= 1 << i;
                                }
                            }
                            Mem[addr] = (byte)data;
                        }
#if DEBUG_WRITE
                        Debug.WriteLine("Time=" + Time.ToString() + ",WEn=" + WEn.State.ToString() + ",RAM Write,Addr=0x" + addr.ToString("X04") + ",Data=" + data.ToString("X02") + ",Name=" + Name);
#endif
                    }
                    lastWEn = WEn.State;
                }
            }

            if ((CSn.State == SignalState.H) && (lastCSn == SignalState.L))
            {
                lastCSn = CSn.State;
                SetNewOutputStates(0, SignalState.Z, Time + OUTPUT_DISABLE_TO_Z - ACCESS_TIME);
            }

            if ((OEn.State == SignalState.H) && (lastOEn == SignalState.L))
            {
                lastOEn = OEn.State;
                SetNewOutputStates(0, SignalState.Z, Time + OUTPUT_DISABLE_TO_Z - ACCESS_TIME);
            }

            if ((WEn.State == SignalState.H) && (lastWEn == SignalState.L))
            {
                lastWEn = WEn.State;
                SetNewOutputStates(0, SignalState.Z, Time + OUTPUT_DISABLE_TO_Z - ACCESS_TIME);
            }

#if DEBUG_WRITE
            Debug.WriteLine("Time=" + Time.ToString() + ",CSn=" + CSn.State.ToString() + ",OEn=" + OEn.State.ToString() + ",WEn=" + WEn.State.ToString() + ",IO0=" + IO0.State.ToString() + ",IO0.DriverActive=" + IO0.DriverActive.ToString());
#endif


        }
        #endregion Public Methods

    }
}
