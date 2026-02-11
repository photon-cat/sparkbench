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
using System.Diagnostics;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

using SimBase;

namespace ChipLibrary
{
    /// <summary>
    /// Class definition of the logic chip MC6850.
    /// </summary>
    internal class MC6850 : BaseElement
    {
        // Datashet: https://theoddys.com/acorn/semiconductor_datasheets/MC6850.pdf

        #region Private Constants
        private const double DATA_DELAY_TIME = 290; // in ns
        private const double TYP_PROPAGATION_DELAY = 10;
        private const double OUTPUT_DISABLE_TO_Z = 50;

        private const int STATUS_RECEIVE_FULL = 1 << 0;
        private const int STATUS_TRANSMIT_EMPTY = 1 << 1;
        private const int STATUS_DCD = 1 << 2;
        private const int STATUS_CTS = 1 << 3;
        private const int STATUS_FE = 1 << 4;
        private const int STATUS_OVRN = 1 << 5;
        private const int STATUS_PE = 1 << 6;
        private const int STATUS_IRQ = 1 << 7;
        #endregion Private Constants


        #region Private Fields
        private byte ctrlReg;
        private bool ctrlRegWritten;
        private byte statusReg;
        private byte transmitReg;
        private bool transmitRegWritten;
        private byte receiveReg;
        private ushort transmitShiftReg;
        private ushort receiveShiftReg;
        private int transmitDivCount;
        private int receiveDivCount;
        private int transmitBitCount;
        private int receiveBitCount;
        private Pin[] dataBus;
        private bool lastBusRequest;
        private SignalState lastRS;
        private SignalState lastWEn;
        private SignalState lastTXCLK;
        private SignalState lastRXCLK;
        private byte lastWrData;
        private bool transmIRQ;
        private bool receiveIRQ;
        private int divMax = 1;
        private int bits = 8;
        private int stop = 1;
        private ushort xmask;
        private ushort rmask;
        private bool receiving = false;
        private enum ParityType
        {
            None = 0,
            Odd = 1,
            Even = 2
        }
        private ParityType parity;
        #endregion Private Fields

        #region Input Pins
        public Pin E;
        public Pin RWn;
        public Pin RS;
        public Pin CS0;
        public Pin CS1;
        public Pin CS2n;

        public Pin TXCLK;
        public Pin RXCLK;
        public Pin RXDATA;
        public Pin DCDn;
        public Pin CTSn;
        #endregion Input Pins

        #region Output Pins
        public Pin RTSn;
        public Pin TXDATA;
        public Pin IRQn;
        #endregion Output Pins

        #region BiDIr Pins
        public Pin D0;
        public Pin D1;
        public Pin D2;
        public Pin D3;
        public Pin D4;
        public Pin D5;
        public Pin D6;
        public Pin D7;
        #endregion BiDIr Pins

        #region Constructors
        /// <summary>
        /// Creates the instance without net connections.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public MC6850(string Name) : this(Name, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null) { }

        /// <summary>
        /// Creates the instance including input net connections.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public MC6850(string Name, Net NetE, Net NetRWn, Net NetRS, Net NetCS0, Net NetCS1, Net NetCS2n, Net NetTXCLK, Net NetRXCLK, Net NetRXDATA, Net NetDCDn, Net NetCTSn,
            Net NetD0, Net NetD1, Net NetD2, Net NetD3, Net NetD4, Net NetD5, Net NetD6, Net NetD7) : base(Name)
        {
            this.Power[0] = new Pin(this, "VCC", "12");
            this.Ground[0] = new Pin(this, "GND", "1");

            ctrlReg = 0;
            ctrlRegWritten = false;
            statusReg = 0;
            transmitReg = 0;
            transmitRegWritten = false;
            receiveReg = 0;
            transmitShiftReg = 0xFFFF;
            receiveShiftReg = 0xFFFF;
            xmask = 0xFE00;
            rmask = 0x80;
            transmitDivCount = 0;
            receiveDivCount = 0;
            transmitBitCount = 0;
            receiveBitCount = 0;
            lastBusRequest = false;
            lastWrData = 0;

            this.E = new Pin(this, "E", "14", LineMode.In, SignalState.H, NetE);
            this.RWn = new Pin(this, "RWn", "13", LineMode.In, SignalState.H, NetRWn);
            this.RS = new Pin(this, "RS", "11", LineMode.In, SignalState.H, NetRS);
            this.CS0 = new Pin(this, "CS0", "8", LineMode.In, SignalState.H, NetCS0);
            this.CS1 = new Pin(this, "CS1", "10", LineMode.In, SignalState.H, NetCS1);
            this.CS2n = new Pin(this, "CS2n", "9", LineMode.In, SignalState.H, NetCS2n);

            this.TXCLK = new Pin(this, "TXCLK", "4", LineMode.In, SignalState.H, NetTXCLK);
            this.RXCLK = new Pin(this, "RXCLK", "3", LineMode.In, SignalState.H, NetRXCLK);
            this.RXDATA = new Pin(this, "RXDATA", "2", LineMode.In, SignalState.H, NetRXDATA);
            this.DCDn = new Pin(this, "DCDn", "23", LineMode.In, SignalState.H, NetDCDn);
            this.CTSn = new Pin(this, "CTSn", "24", LineMode.In, SignalState.H, NetCTSn);

            this.D0 = new Pin(this, "D0", "22", LineMode.BiDir, SignalState.Z, DATA_DELAY_TIME, NetD0);
            this.D1 = new Pin(this, "D1", "21", LineMode.BiDir, SignalState.Z, DATA_DELAY_TIME, NetD1);
            this.D2 = new Pin(this, "D2", "20", LineMode.BiDir, SignalState.Z, DATA_DELAY_TIME, NetD2);
            this.D3 = new Pin(this, "D3", "19", LineMode.BiDir, SignalState.Z, DATA_DELAY_TIME, NetD3);
            this.D4 = new Pin(this, "D4", "18", LineMode.BiDir, SignalState.Z, DATA_DELAY_TIME, NetD4);
            this.D5 = new Pin(this, "D5", "17", LineMode.BiDir, SignalState.Z, DATA_DELAY_TIME, NetD5);
            this.D6 = new Pin(this, "D6", "16", LineMode.BiDir, SignalState.Z, DATA_DELAY_TIME, NetD6);
            this.D7 = new Pin(this, "D7", "15", LineMode.BiDir, SignalState.Z, DATA_DELAY_TIME, NetD7);

            this.RTSn = new Pin(this, "RTSn", "5", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.TXDATA = new Pin(this, "TXDATA", "6", LineMode.Out, SignalState.H, TYP_PROPAGATION_DELAY);
            this.IRQn = new Pin(this, "IRQn", "7", LineMode.OpenDrain, SignalState.H, TYP_PROPAGATION_DELAY);

            Inputs = new Pin[5][];
            SetPinArray(Inputs, 0, new Pin[] { this.E, this.RWn, this.RS });
            SetPinArray(Inputs, 1, new Pin[] { this.CS0, this.CS1, this.CS2n });
            SetPinArray(Inputs, 2, new Pin[] { this.TXCLK, this.RXCLK });
            SetPinArray(Inputs, 3, this.RXDATA);
            SetPinArray(Inputs, 4, new Pin[] { this.DCDn, this.CTSn });

            Outputs = new Pin[4][];
            SetPinArray(Outputs, 0, this.RTSn);
            SetPinArray(Outputs, 1, this.TXDATA);
            SetPinArray(Outputs, 2, this.IRQn);

            dataBus = new Pin[] { this.D0, this.D1, this.D2, this.D3, this.D4, this.D5, this.D6, this.D7 };
            Outputs[3] = dataBus;

            lastRS = this.RS.State;
            lastWEn = this.RWn.State;
            lastTXCLK = this.TXCLK.State;
            lastRXCLK = this.RXCLK.State;

            SimulationRestart();
        }
        #endregion Constructors

        #region Protected and Private Methods
        /// <summary>
        /// Update inputs to the simulation time.
        /// </summary>
        /// <param name="Time">Time value to update to.</param>
        protected override void UpdateInputs(double Time)
        {
            base.UpdateInputs(Time);

            if ((CS0.State == SignalState.H) && (CS1.State == SignalState.H) && (CS2n.State == SignalState.L) && (RWn.State == SignalState.L))
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
            if (RWn.State == SignalState.H)
                base.UpdateOutputs(Time);
        }


        /// <summary>
        /// Update the internal UART functionality.
        /// </summary>
        /// <param name="Time">Time value to update to.</param>
        private void UpdateUART(double Time)
        {
            if (ctrlRegWritten)
            {
                ctrlRegWritten = false;

                switch (ctrlReg & 3)
                {
                    case 0:
                        divMax = 1;
                        break;
                    case 1:
                        divMax = 16;
                        break;
                    case 2:
                        divMax = 64;
                        break;
                    case 3:
                        divMax = 1;
                        break;
                }

                switch ((ctrlReg >> 2) & 7)
                {
                    case 0:
                        bits = 7;
                        stop = 2;
                        parity = ParityType.Even;
                        break;
                    case 1:
                        bits = 7;
                        stop = 2;
                        parity = ParityType.Odd;
                        break;
                    case 2:
                        bits = 7;
                        stop = 1;
                        parity = ParityType.Even;
                        break;
                    case 3:
                        bits = 7;
                        stop = 1;
                        parity = ParityType.Odd;
                        break;
                    case 4:
                        bits = 8;
                        stop = 2;
                        parity = ParityType.None;
                        break;
                    case 5:
                        bits = 8;
                        stop = 1;
                        parity = ParityType.None;
                        break;
                    case 6:
                        bits = 8;
                        stop = 1;
                        parity = ParityType.Even;
                        break;
                    case 7:
                        bits = 8;
                        stop = 1;
                        parity = ParityType.Odd;
                        break;
                }
                if (bits == 8)
                {
                    xmask = 0xFE00;
                    rmask = 0x80;
                }
                else
                {
                    xmask = 0xFF00;
                    rmask = 0x40;
                }

#if DEBUG_WRITE
                Debug.WriteLine("Time=" + Time.ToString() + ",ctrlRegWritten=" + ctrlRegWritten.ToString() + ",divMax=" + divMax.ToString() + ",bits=" + bits.ToString() + ",stop=" + stop.ToString() + ",parity=" + parity.ToString());
#endif
            }

            if (transmitRegWritten)
            {
                transmitRegWritten = false;
                transmitShiftReg = (ushort)((transmitReg << 1) | xmask);
                transmitBitCount = 0;
                TXDATA.NewOutState = SignalState.L;
#if DEBUG_WRITE
                Debug.WriteLine("Time=" + Time.ToString() + ",transmitRegWritten=" + transmitRegWritten.ToString() + ",transmitReg=" + transmitReg.ToString("X02") + ",transmitShiftReg=" + transmitShiftReg.ToString("X04"));
#endif
            }


            if (TXCLK.State != lastTXCLK)
            {
                lastTXCLK = TXCLK.State;
                if (TXCLK.State == SignalState.L)
                {
                    if (++transmitDivCount >= divMax)
                    {
                        transmitDivCount = 0;
                        if ((transmitShiftReg & 1) == 0)
                            TXDATA.NewOutState = SignalState.L;
                        else
                            TXDATA.NewOutState = SignalState.H;

#if DEBUG_WRITE
                        Debug.WriteLine("Time=" + Time.ToString() + ",transmitDivCount=" + transmitDivCount.ToString() + ",TXDATA.NewOutState=" + TXDATA.NewOutState.ToString());
#endif

                        transmitShiftReg = (ushort)((transmitShiftReg >> 1) | xmask);

                        if (++transmitBitCount == (bits + stop + 1))
                        {
                            statusReg |= STATUS_TRANSMIT_EMPTY;
                            if (((ctrlReg >> 5) & 3) == 1)
                            {
                                if (RTSn.State == SignalState.L)
                                    transmIRQ = true;
                            }
                        }

                    }
                }
            }

            if (receiving)
            {
                if (RXCLK.State != lastRXCLK)
                {
                    lastRXCLK = RXCLK.State;
                    if (RXCLK.State == SignalState.H)
                    {
                        if (++receiveDivCount >= divMax)
                        {
                            receiveDivCount = 0;
                            if (++receiveBitCount <= (1 + bits))
                            {
                                receiveShiftReg >>= 1;
                                if (RXDATA.State == SignalState.H)
                                    receiveShiftReg |= rmask;
                            }
                            if (receiveBitCount == (1 + bits + stop))
                            {
                                receiveReg = (byte)receiveShiftReg;
                                statusReg |= STATUS_RECEIVE_FULL;

                                if ((ctrlReg & 0x80) != 0)
                                    receiveIRQ = true;

                                receiving = false;
                            }
                        }
                    }
                }
            }
            else
            {
                if (RXDATA.State == SignalState.L)
                {
                    receiving = true;
                    lastRXCLK = RXCLK.State;
                    receiveDivCount = -divMax / 2;
                    receiveShiftReg = 0;
                    receiveBitCount = 0;
                }
            }

            if (transmIRQ || receiveIRQ)
                IRQn.NewOutState = SignalState.L;
            else
                IRQn.NewOutState = SignalState.H;

        }
        #endregion Protected and Private Methods

        #region Public Methods
        /// <summary>
        /// Restart the simulation for all fields.
        /// </summary>
        public override void SimulationRestart()
        {
            base.SimulationRestart();
            transmitShiftReg = 0xFFFF;
            receiveShiftReg = 0xFFFF;
            xmask = 0xFF00;
            rmask = 0x100;
            transmIRQ = false;
            receiveIRQ = false;
            statusReg = STATUS_TRANSMIT_EMPTY;
            IRQn.NewOutState = SignalState.H;
            TXDATA.NewOutState = SignalState.H;
        }

        /// <summary>
        /// Update outputs and inputs to the simulation time.
        /// </summary>
        /// <param name="Time">Time value to update to.</param>
        public override void Update(double Time)
        {
            base.Update(Time);
            bool busRequest = (E.State == SignalState.H) && (CS0.State == SignalState.H) && (CS1.State == SignalState.H) && (CS2n.State == SignalState.L);

            if (busRequest)
            {
#if DEBUG_WRITE
                Debug.WriteLine("Time=" + Time.ToString() + ",busRequest=" + busRequest.ToString() + ",RWn.State=" + RWn.State.ToString() + ",RS.State=" + RS.State.ToString());
#endif
                if (RWn.State == SignalState.L)
                {
                    lastWEn = RWn.State;
                    lastRS = RS.State;

                    int data = 0;
                    for (int i = 0; i < dataBus.Length; i++)
                    {
                        if (dataBus[i].State == SignalState.L)
                        { }
                        else if (dataBus[i].State == SignalState.H)
                            data |= 1 << i;
                    }
                    lastWrData = (byte)data;
#if DEBUG_WRITE
                    Debug.WriteLine("Time=" + Time.ToString() + ",busRequest=" + busRequest.ToString() + ",data=" + data.ToString("X02"));
#endif                    
                }
                else
                {
                    if (lastBusRequest == false)
                    {
                        int data = 0;
                        if (RS.State == SignalState.L)
                            data = statusReg;
                        else
                        {
                            data = receiveReg;
                            receiveIRQ = false;
                        }

                        for (int i = 0; i < dataBus.Length; i++)
                        {
                            if ((data & 1) == 0)
                                dataBus[i].NewOutState = SignalState.L;
                            else
                                dataBus[i].NewOutState = SignalState.H;
                            data >>= 1;
                        }
                    }
                }
                lastBusRequest = true;
            }

            if ((busRequest == false) && (lastBusRequest == true))
            {
                if (lastWEn == SignalState.L)
                {
                    if (lastRS == SignalState.L)
                    {
                        ctrlReg = lastWrData;
                        ctrlRegWritten = true;
#if DEBUG_WRITE
                        Debug.WriteLine("Time=" + Time.ToString() + ",busRequest=" + busRequest.ToString() + ",lastWrData=" + lastWrData.ToString("X02") + ",ctrlRegWritten=" + ctrlRegWritten.ToString());
#endif
                    }
                    else
                    {
                        transmitReg = lastWrData;
                        transmitRegWritten = true;
                        transmIRQ = false;
#if DEBUG_WRITE
                        Debug.WriteLine("Time=" + Time.ToString() + ",busRequest=" + busRequest.ToString() + ",lastWrData=" + lastWrData.ToString("X02") + ",transmitRegWritten=" + transmitRegWritten.ToString());
#endif
                    }
                    lastWEn = SignalState.H;
                }

                SetNewOutputStates(3, SignalState.Z, Time + OUTPUT_DISABLE_TO_Z);
                lastBusRequest = false;
            }

            UpdateUART(Time);
        }
        #endregion Public Methods

    }
}